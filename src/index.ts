import { HttpClient } from '@effect/platform-node'
import { Effect, Layer, LogLevel, Logger } from 'effect'
import { program } from './Program.js'
import * as Redis from './Redis.js'

const HttpClientLive = Layer.succeed(
  HttpClient.client.Client,
  HttpClient.client.makeDefault(request =>
    Effect.Do.pipe(
      Effect.tap(() => Effect.logDebug('Sending HTTP Request').pipe(Effect.annotateLogs({ headers: request.headers }))),
      Effect.zipRight(HttpClient.client.fetch()(request)),
      Effect.tap(response =>
        Effect.logDebug('Received HTTP response').pipe(
          Effect.annotateLogs({ status: response.status, headers: response.headers }),
        ),
      ),
      Effect.tapErrorTag('RequestError', error =>
        Effect.logError('Error sending HTTP request').pipe(
          Effect.annotateLogs({ reason: error.reason, error: error.error }),
        ),
      ),
      Effect.annotateLogs({
        url: request.url,
        urlParams: HttpClient.urlParams.toString(request.urlParams),
        method: request.method,
      }),
      Effect.withLogSpan('fetch'),
    ),
  ),
)

const RedisLive = Redis.layer

const ProgramLive = Layer.mergeAll(HttpClientLive, RedisLive)

const runnable = Effect.provide(program, ProgramLive).pipe(Logger.withMinimumLogLevel(LogLevel.Debug))

await Effect.runPromise(runnable)
