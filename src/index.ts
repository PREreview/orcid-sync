import { HttpClient } from '@effect/platform'
import { Effect, Layer } from 'effect'
import IoRedis from 'ioredis'
import { program } from './Program.js'
import * as Redis from './Redis.js'

const RedisLive = Layer.effect(
  Redis.Redis,
  Effect.gen(function* (_) {
    const redis = new IoRedis.Redis()

    yield* _(Effect.addFinalizer(() => Effect.sync(() => redis.disconnect())))

    return redis
  }),
)

const ProgramLive = Layer.mergeAll(HttpClient.client.layer, RedisLive)

const runnable = Effect.provide(program, ProgramLive).pipe(Effect.scoped)

await Effect.runPromise(runnable)
