import { HttpClient } from '@effect/platform'
import { type ParseResult, Schema } from '@effect/schema'
import { Effect, type ReadonlyRecord } from 'effect'
import { DoiSchema } from './Doi.js'
import type * as OrcidId from './OrcidId.js'
import * as Temporal from './Temporal.js'
import * as Url from './Url.js'

type Records = Schema.Schema.To<typeof RecordsSchema>['hits']

type GetRecordsForOrcidIdError = HttpClient.error.HttpClientError | ParseResult.ParseError

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
  params: ReadonlyRecord.ReadonlyRecord<string>,
): Effect.Effect<HttpClient.client.Client.Default, GetRecordsForOrcidIdError, Records> =>
  Effect.gen(function* (_) {
    const client = yield* _(zenodoClient)

    const response = yield* _(
      HttpClient.request.get('records', { urlParams: params }),
      client,
      Effect.flatMap(HttpClient.response.schemaBodyJson(RecordsSchema)),
    )

    return response.hits
  })

const RecordsSchema = Schema.struct({
  hits: Schema.struct({
    hits: Schema.array(
      Schema.struct({
        doi: DoiSchema,
        metadata: Schema.struct({
          publication_date: Temporal.PlainDataFromStringSchema(Schema.string),
          related_identifiers: Schema.array(
            Schema.union(
              Schema.struct({
                identifier: DoiSchema,
                relation: Schema.string,
                scheme: Schema.literal('doi'),
              }),
              Schema.struct({
                identifier: Url.UrlFromStringSchema(Schema.string),
                relation: Schema.string,
                scheme: Schema.literal('url'),
              }),
            ),
          ),
        }),
      }),
    ),
    total: Schema.nonNegative()(Schema.number),
  }),
})

const zenodoClient = Effect.gen(function* (_) {
  const httpClient = yield* _(HttpClient.client.Client)

  return httpClient.pipe(
    HttpClient.client.filterStatusOk,
    HttpClient.client.mapRequest(HttpClient.request.acceptJson),
    HttpClient.client.mapRequest(HttpClient.request.prependUrl('https://sandbox.zenodo.org/api/')),
  )
})
