import { Effect, ReadonlyArray, Stream, flow } from 'effect'
import * as Orcid from './Orcid.js'
import type * as OrcidId from './OrcidId.js'
import * as Users from './Users.js'
import * as Zenodo from './Zenodo.js'

const getPeerReviewsDoisForOrcidId = flow(
  Orcid.getPeerReviewsForOrcidId,
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
  Zenodo.getReviewsByOrcidId,
  Effect.tap(reviews =>
    Effect.gen(function* (_) {
      if (reviews.total < 1) {
        return yield* _(Effect.logInfo('No reviews on Zenodo found'))
      }
      yield* _(Effect.logInfo('Found reviews on Zenodo').pipe(Effect.annotateLogs('total', reviews.total)))
    }),
  ),
  Effect.map(reviews => reviews.hits),
)
const processUser = ({ orcidId, accessToken }: { orcidId: OrcidId.OrcidId; accessToken: string }) =>
  Effect.gen(function* (_) {
    yield* _(Effect.logInfo('Processing user'))

    const [zenodoReviews, orcidReviews] = yield* _(
      Effect.all([getPeerReviewsOnZenodoForOrcidId(orcidId), getPeerReviewsDoisForOrcidId(orcidId)], {
        concurrency: 'inherit',
      }),
    )

    yield* _(
      Effect.forEach(
        ReadonlyArray.difference(
          ReadonlyArray.map(zenodoReviews, review => review.doi),
          orcidReviews,
        ),
        doi => Effect.logWarning('Need to add review').pipe(Effect.annotateLogs('doi', doi)),
      ),
    )
  }).pipe(
    Effect.annotateLogs('orcidId', orcidId),
    Effect.provideService(Orcid.OrcidAccessToken, { token: accessToken }),
  )

export const program = Users.getUsers.pipe(Stream.runForEach(processUser)).pipe(Effect.scoped)
