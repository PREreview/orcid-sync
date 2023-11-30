import { Schema } from '@effect/schema'
import { Context, Data, Effect, type ReadonlyArray, Stream } from 'effect'
import type IoRedis from 'ioredis'

export type Redis = IoRedis.Redis

export const Redis = Context.Tag<Redis>('IoRedis/Redis')

export class RedisError extends Data.TaggedError('RedisError')<{
  readonly error: unknown
}> {}

export const scanStream = (
  options: Parameters<Redis['scanStream']>[0],
): Stream.Stream<Redis, RedisError, ReadonlyArray<string>> =>
  Stream.unwrap(
    Effect.gen(function* (_) {
      const redis = yield* _(Redis)

      return Stream.fromAsyncIterable(redis.scanStream(options), error => new RedisError({ error }))
    }),
  ).pipe(Stream.map(Schema.decodeSync(Schema.array(Schema.string))))
