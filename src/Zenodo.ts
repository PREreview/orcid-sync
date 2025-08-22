import { HttpClient } from '@effect/platform'
import { type ParseResult, Schema } from '@effect/schema'
import { Context, Effect, type RateLimiter, type Record } from 'effect'
import { DoiSchema } from './Doi.js'
import type * as OrcidId from './OrcidId.js'
import * as Temporal from './Temporal.js'
import * as Url from './Url.js'

type Records = Schema.Schema.Type<typeof RecordsSchema>['hits']

type GetRecordsForOrcidIdError = HttpClient.error.HttpClientError | ParseResult.ParseError

export interface ZenodoConfig {
  readonly url: URL
  readonly rateLimit: RateLimiter.RateLimiter
}

export const ZenodoConfig = Context.GenericTag<ZenodoConfig>('ZenodoConfig')

export const getReviewsByOrcidId = (orcid: OrcidId.OrcidId) =>
  getRecords({
    q: `metadata.creators.person_or_org.identifiers.identifier:${orcid}`,
    page: '1',
    size: '100',
    sort: 'publication-desc',
    resource_type: 'publication::publication-peerreview',
    communities: 'prereview-reviews',
  })

const getRecords = (
  params: Record.ReadonlyRecord<string, string>,
): Effect.Effect<Records, GetRecordsForOrcidIdError, ZenodoConfig | HttpClient.client.Client.Default> =>
  Effect.gen(function* (_) {
    const client = yield* _(zenodoClient)

    const response = yield* _(
      HttpClient.request.get('records', { urlParams: params }),
      client,
      Effect.flatMap(HttpClient.response.schemaBodyJson(RecordsSchema)),
      Effect.scoped,
    )

    return response.hits
  })

const RecordsSchema = Schema.Struct({
  hits: Schema.Struct({
    hits: Schema.Array(
      Schema.Struct({
        doi: DoiSchema,
        metadata: Schema.Struct({
          publication_date: Temporal.PlainDateSchema,
          related_identifiers: Schema.Array(
            Schema.Union(
              Schema.Struct({
                identifier: DoiSchema,
                relation: Schema.String,
                scheme: Schema.Literal('doi'),
              }),
              Schema.Struct({
                identifier: Url.UrlSchema,
                relation: Schema.String,
                scheme: Schema.Literal('url'),
              }),
            ),
          ),
        }),
      }),
    ),
    total: Schema.nonNegative()(Schema.Number),
  }),
})

const zenodoClient = Effect.gen(function* (_) {
  const config = yield* _(ZenodoConfig)
  const httpClient = yield* _(HttpClient.client.Client)

  return httpClient.pipe(
    HttpClient.client.filterStatusOk,
    HttpClient.client.mapRequest(HttpClient.request.acceptJson),
    HttpClient.client.mapRequest(HttpClient.request.prependUrl(new URL('/api/', config.url).href)),
    HttpClient.client.transform(config.rateLimit),
  )
})
