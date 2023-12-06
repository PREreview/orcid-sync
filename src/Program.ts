import { Effect, Match, ReadonlyArray, Stream, flow } from 'effect'
import * as Decision from './Decision.js'
import type * as Doi from './Doi.js'
import * as Orcid from './Orcid.js'
import * as Users from './Users.js'
import * as Zenodo from './Zenodo.js'

const getPeerReviewsDoisForOrcidId = flow(
  (user: Users.User) => Orcid.getPeerReviewsForOrcidId(user.orcidId),
  Effect.flatMap(
    ReadonlyArray.findFirst(
      group => group['external-ids']['external-id'][0]['external-id-value'] === 'orcid-generated:prereview',
    ),
  ),
  Effect.map(group =>
    ReadonlyArray.map(
      group['peer-review-group'],
      peerReview => peerReview['external-ids']['external-id'][0]['external-id-value'],
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
  Effect.map(reviews => ReadonlyArray.map(reviews.hits, review => review.doi)),
)

const makeDecisions = ({
  user,
  zenodoReviews,
  orcidReviews,
}: {
  user: Users.User
  zenodoReviews: ReadonlyArray<Doi.Doi>
  orcidReviews: ReadonlyArray<Doi.Doi>
}) =>
  ReadonlyArray.union(
    ReadonlyArray.difference(zenodoReviews, orcidReviews).map(doi => Decision.AddReviewToProfile({ user, doi })),
    ReadonlyArray.difference(orcidReviews, zenodoReviews).map(doi => Decision.RemoveReviewFromProfile({ user, doi })),
  )

const processUser = (user: Users.User) =>
  Effect.gen(function* (_) {
    yield* _(Effect.logInfo('Processing user'))

    const decisions = yield* _(
      Effect.all(
        {
          zenodoReviews: getPeerReviewsOnZenodoForOrcidId(user),
          orcidReviews: getPeerReviewsDoisForOrcidId(user),
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
      Effect.all(
        ReadonlyArray.map(
          decisions,
          Match.valueTags({
            AddReviewToProfile: decision =>
              Effect.logWarning('Need to add review').pipe(Effect.annotateLogs('doi', decision.doi)),
            RemoveReviewFromProfile: decision =>
              Effect.logWarning('Need to remove review').pipe(Effect.annotateLogs('doi', decision.doi)),
          }),
        ),
        { concurrency: 'inherit' },
      ),
    )
  }).pipe(
    Effect.annotateLogs('orcidId', user.orcidId),
    Effect.provideService(Orcid.OrcidAccessToken, { token: user.accessToken }),
  )

export const program = Users.getUsers.pipe(Stream.runForEach(processUser)).pipe(Effect.scoped)
