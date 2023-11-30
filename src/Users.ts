import { type ParseResult, Schema } from '@effect/schema'
import { Data, Effect, ReadonlyArray, type Scope, Stream, String, flow, identity } from 'effect'
import * as OrcidId from './OrcidId.js'
import * as Redis from './Redis.js'

export interface User extends Data.Case {
  readonly orcidId: OrcidId.OrcidId
  readonly accessToken: string
}

export const User = Data.case<User>()

export const getUsers: Stream.Stream<Redis.Redis | Scope.Scope, Redis.RedisError | ParseResult.ParseError, User> =
  Redis.scanStream({
    match: 'orcid-token:*',
  }).pipe(
    Stream.mapConcat(identity),
    Stream.map(String.split(':')),
    Stream.map(ReadonlyArray.lastNonEmpty),
    Stream.flatMap(Schema.decodeEither(OrcidId.OrcidIdSchema)),
    Stream.bindTo('orcidId'),
    Stream.bind('accessToken', ({ orcidId }) => getAccessToken(orcidId)),
    Stream.map(User),
  )

const OrcidTokenSchema = Schema.struct({ value: Schema.struct({ accessToken: Schema.string }) })

const getAccessToken = flow(
  (orcidId: OrcidId.OrcidId) => Redis.get(`orcid-token:${orcidId}`),
  Effect.flatMap(Schema.parse(Schema.ParseJson.pipe(Schema.compose(OrcidTokenSchema)))),
  Effect.map(({ value }) => value.accessToken),
)
