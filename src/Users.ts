import { type ParseResult, Schema } from '@effect/schema'
import { type Cause, Data, Effect, ReadonlyArray, Stream, String, flow } from 'effect'
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
  Stream.map(ReadonlyArray.lastNonEmpty),
  Stream.flatMap(Schema.decodeEither(OrcidId.OrcidIdSchema)),
  Stream.bindTo('orcidId'),
  Stream.bind('accessToken', ({ orcidId }) => getAccessToken(orcidId)),
  Stream.map(User),
)

const OrcidTokenSchema = Schema.Struct({ value: Schema.Struct({ accessToken: Schema.String }) })

const getAccessToken = flow(
  (orcidId: OrcidId.OrcidId) => Effect.flatten(Redis.get(`orcid-token:${orcidId}`)),
  Effect.flatMap(Schema.decodeUnknown(Schema.parseJson(OrcidTokenSchema))),
  Effect.map(({ value }) => value.accessToken),
)
