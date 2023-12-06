import { HttpClient } from '@effect/platform'
import { type ParseResult, Schema } from '@effect/schema'
import { Context, Effect } from 'effect'
import { DoiSchema } from './Doi.js'
import type { OrcidId } from './OrcidId.js'

export interface OrcidAccessToken {
  readonly token: string
}

export const OrcidAccessToken = Context.Tag<OrcidAccessToken>()

type PeerReviews = Schema.Schema.To<typeof PeerReviewsSchema>['group']

type GetPeerReviewsForOrcidIdError = HttpClient.error.HttpClientError | ParseResult.ParseError
type DeletePeerReviewError = HttpClient.error.HttpClientError

export const getPeerReviewsForOrcidId = (
  id: OrcidId,
): Effect.Effect<HttpClient.client.Client.Default | OrcidAccessToken, GetPeerReviewsForOrcidIdError, PeerReviews> =>
  Effect.gen(function* (_) {
    const client = yield* _(orcidClient)

    const response = yield* _(
      HttpClient.request.get(`${id}/peer-reviews`),
      client,
      Effect.flatMap(HttpClient.response.schemaBodyJson(PeerReviewsSchema)),
    )

    return response.group
  })

export const deletePeerReview = ({
  orcid,
  id,
}: {
  orcid: OrcidId
  id: number
}): Effect.Effect<HttpClient.client.Client.Default | OrcidAccessToken, DeletePeerReviewError, void> =>
  Effect.gen(function* (_) {
    const client = yield* _(orcidClient)

    yield* _(HttpClient.request.del(`${orcid}/peer-review/${id}`), client)
  })

const PeerReviewsSchema = Schema.struct({
  group: Schema.array(
    Schema.struct({
      'external-ids': Schema.struct({
        'external-id': Schema.tuple(
          Schema.struct({
            'external-id-type': Schema.literal('peer-review'),
            'external-id-value': Schema.string,
          }),
        ),
      }),
      'peer-review-group': Schema.array(
        Schema.struct({
          'external-ids': Schema.struct({
            'external-id': Schema.tuple(
              Schema.struct({
                'external-id-type': Schema.literal('doi'),
                'external-id-value': DoiSchema,
              }),
            ),
          }),
          'peer-review-summary': Schema.tuple(
            Schema.struct({
              'put-code': Schema.number,
            }),
          ),
        }),
      ),
    }),
  ),
})

const orcidClient = Effect.gen(function* (_) {
  const httpClient = yield* _(HttpClient.client.Client)
  const { token } = yield* _(OrcidAccessToken)

  return httpClient.pipe(
    HttpClient.client.filterStatusOk,
    HttpClient.client.mapRequest(HttpClient.request.accept('application/vnd.orcid+json')),
    HttpClient.client.mapRequest(HttpClient.request.prependUrl('https://api.sandbox.orcid.org/v3.0/')),
    HttpClient.client.mapRequest(HttpClient.request.bearerToken(token)),
  )
})
