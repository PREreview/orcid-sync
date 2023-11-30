import { Effect, Stream } from 'effect'
import type * as OrcidId from './OrcidId.js'
import * as Users from './Users.js'
import * as Zenodo from './Zenodo.js'

const processUser = (orcidId: OrcidId.OrcidId) =>
  Effect.gen(function* (_) {
    yield* _(Effect.logInfo('Processing user'))

    const reviews = yield* _(Zenodo.getReviewsByOrcidId(orcidId))

    if (reviews.total < 1) {
      return yield* _(Effect.logInfo('No reviews found'))
    }

    yield* _(Effect.logInfo('Found reviews').pipe(Effect.annotateLogs('total', reviews.total)))
  }).pipe(Effect.annotateLogs('orcidId', orcidId))

export const program = Users.getUsers.pipe(Stream.runForEach(processUser)).pipe(Effect.scoped)
