import { Schema } from '@effect/schema'
import { Chunk, Context, Data, Effect, Layer, Option, Runtime, Stream } from 'effect'
import IoRedis from 'ioredis'

export type Redis = IoRedis.Redis

export interface RedisConfig {
  readonly url: URL
}

export const Redis = Context.GenericTag<Redis>('IoRedis/Redis')

export const RedisConfig = Context.GenericTag<RedisConfig>('RedisConfig')

export class RedisError extends Data.TaggedError('RedisError')<{
  readonly error: unknown
}> {}

export const layer: Layer.Layer<Redis, never, RedisConfig> = Layer.scoped(
  Redis,
  Effect.acquireRelease(
    Effect.gen(function* (_) {
      const config = yield* _(RedisConfig)
      const runtime = yield* _(Effect.runtime())

      const redis = new IoRedis.Redis(config.url.href)

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
): Stream.Stream<Chunk.Chunk<string>, RedisError, Redis> =>
  Stream.unwrap(
    Effect.gen(function* (_) {
      const redis = yield* _(Redis)

      return Stream.fromAsyncIterable(redis.scanStream(options), error => new RedisError({ error }))
    }),
  ).pipe(Stream.map(Schema.decodeSync(Schema.array(Schema.string))), Stream.map(Chunk.fromIterable))

export const get = (key: IoRedis.RedisKey): Effect.Effect<Option.Option<string>, RedisError, Redis> =>
  Effect.gen(function* (_) {
    const redis = yield* _(Redis)

    return yield* _(Effect.tryPromise({ try: () => redis.get(key), catch: error => new RedisError({ error }) }))
  }).pipe(Effect.map(Option.fromNullable))
