import { Effect, Match, Option, ReadonlyArray, Stream, flow } from 'effect'
import * as Decision from './Decision.js'
import * as Doi from './Doi.js'
import * as Orcid from './Orcid.js'
import type * as OrcidId from './OrcidId.js'
import type * as Temporal from './Temporal.js'
import * as Users from './Users.js'
import * as Zenodo from './Zenodo.js'

const getPeerReviewsForOrcidId = flow(
  (user: Users.User) => Orcid.getPeerReviewsForOrcidId(user.orcidId),
  Effect.flatMap(
    ReadonlyArray.findFirst(
      group => group['external-ids']['external-id'][0]['external-id-value'] === 'orcid-generated:prereview',
    ),
  ),
  Effect.map(group =>
    ReadonlyArray.map(
      group['peer-review-group'],
      peerReview =>
        ({
          doi: peerReview['external-ids']['external-id'][0]['external-id-value'],
          id: peerReview['peer-review-summary'][0]['put-code'],
        }) satisfies OrcidReview,
    ),
  ),
  Effect.catchTag('NoSuchElementException', () => Effect.succeed([])),
  Effect.tap(reviews =>
    Effect.gen(function* (_) {
      if (reviews.length < 1) {
        return yield* _(Effect.logInfo('No reviews on ORCID found'))
      }
      yield* _(Effect.logInfo('Found reviews on ORCID').pipe(Effect.annotateLogs('total', reviews.length)))
    }),
  ),
)

const addPeerReview = ({ orcid, review }: { orcid: OrcidId.OrcidId; review: ZenodoReview }) =>
  Orcid.addPeerReviewToOrcidId({
    id: orcid,
    peerReview: {
      'reviewer-role': 'reviewer',
      'review-identifiers': {
        'external-id': {
          'external-id-type': 'doi',
          'external-id-value': review.doi,
          'external-id-relationship': 'self',
        },
      },
      'review-url': new URL(review.doi.replace(/10\.(5072|5281)\/zenodo\./, 'https://prereview.org/reviews/')),
      'review-type': 'review',
      'review-completion-date': review.publicationDate,
      'review-group-id': 'orcid-generated:prereview',
      'subject-external-identifier': {
        'external-id-type': 'doi',
        'external-id-value': review.preprintDoi,
        'external-id-relationship': 'self',
      },
      'subject-url': Doi.toUrl(review.preprintDoi),
      'convening-organization': {
        name: 'PREreview',
        address: {
          city: 'Portland',
          country: 'US',
        },
      },
    },
  })

const getPeerReviewsOnZenodoForOrcidId = flow(
  (user: Users.User) => Zenodo.getReviewsByOrcidId(user.orcidId),
  Effect.tap(reviews =>
    Effect.gen(function* (_) {
      if (reviews.total < 1) {
        return yield* _(Effect.logInfo('No reviews on Zenodo found'))
      }
      yield* _(Effect.logInfo('Found reviews on Zenodo').pipe(Effect.annotateLogs('total', reviews.total)))
    }),
  ),
  Effect.map(reviews =>
    ReadonlyArray.map(
      reviews.hits,
      review =>
        ({
          doi: review.doi,
          preprintDoi: ReadonlyArray.findFirst(
            review.metadata.related_identifiers,
            relatedIdentifier => relatedIdentifier.relation === 'reviews' && relatedIdentifier.scheme === 'doi',
          ).pipe(
            Option.map(relatedIdentifier => relatedIdentifier.identifier),
            Option.filter(Doi.isDoi),
            Option.getOrThrow,
          ),
          publicationDate: review.metadata.publication_date,
        }) satisfies ZenodoReview,
    ),
  ),
)

interface ZenodoReview {
  readonly doi: Doi.Doi
  readonly preprintDoi: Doi.Doi
  readonly publicationDate: Temporal.PlainDate
}

interface OrcidReview {
  readonly doi: Doi.Doi
  readonly id: number
}

const makeDecisions = ({
  user,
  zenodoReviews,
  orcidReviews,
}: {
  user: Users.User
  zenodoReviews: ReadonlyArray<ZenodoReview>
  orcidReviews: ReadonlyArray<OrcidReview>
}) =>
  ReadonlyArray.union(
    ReadonlyArray.filter(
      zenodoReviews,
      zenodoReview =>
        !ReadonlyArray.contains(
          orcidReviews.map(review => review.doi),
          zenodoReview.doi,
        ),
    ).map(zenodoReview =>
      Decision.AddReviewToProfile({
        user,
        ...zenodoReview,
      }),
    ),
    ReadonlyArray.filter(
      orcidReviews,
      orcidReview =>
        !ReadonlyArray.contains(
          zenodoReviews.map(review => review.doi),
          orcidReview.doi,
        ),
    ).map(orcidReview =>
      Decision.RemoveReviewFromProfile({
        user,
        id: orcidReview.id,
      }),
    ),
  )

const processUser = (user: Users.User) =>
  Effect.gen(function* (_) {
    yield* _(Effect.logInfo('Processing user'))

    const decisions = yield* _(
      Effect.all(
        {
          zenodoReviews: getPeerReviewsOnZenodoForOrcidId(user),
          orcidReviews: getPeerReviewsForOrcidId(user),
        },
        { concurrency: 'inherit' },
      ).pipe(
        Effect.let('user', () => user),
        Effect.map(makeDecisions),
      ),
    )

    if (ReadonlyArray.isEmptyArray(decisions)) {
      return yield* _(Effect.logInfo('Nothing to do'))
    }

    yield* _(
      Effect.forEach(
        decisions,
        Match.valueTags({
          AddReviewToProfile: decision =>
            Effect.gen(function* (_) {
              yield* _(Effect.logWarning('Adding review').pipe(Effect.annotateLogs('doi', decision.doi)))

              yield* _(addPeerReview({ orcid: user.orcidId, review: decision }))
            }),
          RemoveReviewFromProfile: ({ user, id }) =>
            Effect.gen(function* (_) {
              yield* _(Effect.logWarning('Removing review').pipe(Effect.annotateLogs('id', id)))

              yield* _(Orcid.deletePeerReview({ orcid: user.orcidId, id }))
            }),
        }),
        { concurrency: 'inherit' },
      ),
    )
  }).pipe(
    Effect.annotateLogs('orcidId', user.orcidId),
    Effect.provideService(Orcid.OrcidAccessToken, { token: user.accessToken }),
  )

export const program = Users.getUsers.pipe(Stream.runForEach(processUser))
