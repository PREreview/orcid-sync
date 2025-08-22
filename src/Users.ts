import { type ParseResult, Schema } from '@effect/schema'
import { Array, type Cause, Data, Effect, Stream, String, flow } from 'effect'
import * as OrcidId from './OrcidId.js'
import * as Redis from './Redis.js'

export interface User {
  readonly orcidId: OrcidId.OrcidId
  readonly accessToken: string
}

export const User = Data.case<User>()

export const getUsers: Stream.Stream<
  User,
  Redis.RedisError | ParseResult.ParseError | Cause.NoSuchElementException,
  Redis.Redis
> = Redis.scanStream({
  match: 'orcid-token:*',
}).pipe(
  Stream.flattenChunks,
  Stream.map(String.split(':')),
  Stream.map(Array.lastNonEmpty),
  Stream.flatMap(Schema.decodeEither(OrcidId.OrcidIdSchema)),
  Stream.bindTo('orcidId'),
  Stream.bind('accessToken', ({ orcidId }) => getAccessToken(orcidId)),
  Stream.filterEffect(({ accessToken, orcidId }) =>
    Effect.if(accessToken.scopes.includes('/activities/update'), {
      onTrue: () => Effect.succeed(true),
      onFalse: () =>
        Effect.succeed(false).pipe(
          Effect.tap(Effect.logWarning('Skipping user')),
          Effect.annotateLogs({ orcidId, scopes: accessToken.scopes }),
        ),
    }),
  ),
  Stream.map(({ accessToken: { accessToken }, orcidId }) => User({ accessToken, orcidId })),
)

const OrcidTokenSchema = Schema.Struct({
  value: Schema.Struct({ accessToken: Schema.String, scopes: Schema.Array(Schema.String) }),
})

const getAccessToken = flow(
  (orcidId: OrcidId.OrcidId) => Effect.flatten(Redis.get(`orcid-token:${orcidId}`)),
  Effect.flatMap(Schema.decodeUnknown(Schema.parseJson(OrcidTokenSchema))),
  Effect.map(({ value }) => value),
)
