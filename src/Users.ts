import { type ParseResult, Schema } from '@effect/schema'
import { ReadonlyArray, type Scope, Stream, String, identity } from 'effect'
import * as OrcidId from './OrcidId.js'
import * as Redis from './Redis.js'

export const getUsers: Stream.Stream<
  Redis.Redis | Scope.Scope,
  Redis.RedisError | ParseResult.ParseError,
  OrcidId.OrcidId
> = Redis.scanStream({
  match: 'orcid-token:*',
}).pipe(
  Stream.mapConcat(identity),
  Stream.map(String.split(':')),
  Stream.map(ReadonlyArray.lastNonEmpty),
  Stream.flatMap(Schema.decodeEither(OrcidId.OrcidIdSchema)),
)
