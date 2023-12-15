import { Schema } from '@effect/schema'
import { Context, Data, Effect, Layer, Runtime, Stream } from 'effect'
import IoRedis from 'ioredis'

export type Redis = IoRedis.Redis

export const Redis = Context.Tag<Redis>('IoRedis/Redis')

export class RedisError extends Data.TaggedError('RedisError')<{
  readonly error: unknown
}> {}

export const layer: Layer.Layer<never, never, Redis> = Layer.scoped(
  Redis,
  Effect.acquireRelease(
    Effect.gen(function* (_) {
      const runtime = yield* _(Effect.runtime<never>())

      const redis = new IoRedis.Redis()

      redis.on('connect', () => Runtime.runSync(runtime)(Effect.logDebug('Redis connected')))
      redis.on('close', () => Runtime.runSync(runtime)(Effect.logDebug('Redis connection closed')))
      redis.on('reconnecting', () => Runtime.runSync(runtime)(Effect.logInfo('Redis reconnecting')))
      redis.removeAllListeners('error')
      redis.on('error', (error: Error) =>
        Runtime.runSync(runtime)(
          Effect.logError('Redis connection error').pipe(Effect.annotateLogs({ error: error.message })),
        ),
      )

      return redis
    }),
    redis => Effect.sync(() => redis.disconnect()),
  ),
)

export const scanStream = (
  options: Parameters<Redis['scanStream']>[0],
): Stream.Stream<Redis, RedisError, ReadonlyArray<string>> =>
  Stream.unwrap(
    Effect.gen(function* (_) {
      const redis = yield* _(Redis)

      return Stream.fromAsyncIterable(redis.scanStream(options), error => new RedisError({ error }))
    }),
  ).pipe(Stream.map(Schema.decodeSync(Schema.array(Schema.string))))

export const get = (key: IoRedis.RedisKey): Effect.Effect<Redis, RedisError, string | null> =>
  Effect.gen(function* (_) {
    const redis = yield* _(Redis)

    return yield* _(Effect.tryPromise({ try: () => redis.get(key), catch: error => new RedisError({ error }) }))
  })
