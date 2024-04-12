import { HttpClient } from '@effect/platform'
import { type ParseResult, Schema } from '@effect/schema'
import { Context, Effect } from 'effect'
import { DoiSchema } from './Doi.js'
import type { OrcidId } from './OrcidId.js'
import * as Temporal from './Temporal.js'
import * as Url from './Url.js'

export interface OrcidAccessToken {
  readonly token: string
}

export const OrcidAccessToken = Context.GenericTag<OrcidAccessToken>('OrcidAccessToken')

type PeerReviews = Schema.Schema.Type<typeof PeerReviewsSchema>['group']
type NewPeerReview = Schema.Schema.Type<typeof NewPeerReviewSchema>

type GetPeerReviewsForOrcidIdError = HttpClient.error.HttpClientError | ParseResult.ParseError
type AddPeerReviewToOrcidIdError = HttpClient.error.HttpClientError | HttpClient.body.BodyError
type DeletePeerReviewError = HttpClient.error.HttpClientError

export interface OrcidConfig {
  readonly url: URL
}

export const OrcidConfig = Context.GenericTag<OrcidConfig>('OrcidConfig')

export const getPeerReviewsForOrcidId = (
  id: OrcidId,
): Effect.Effect<
  PeerReviews,
  GetPeerReviewsForOrcidIdError,
  OrcidConfig | HttpClient.client.Client.Default | OrcidAccessToken
> =>
  Effect.gen(function* (_) {
    const client = yield* _(orcidClient)

    const response = yield* _(
      HttpClient.request.get(`${id}/peer-reviews`),
      client,
      Effect.flatMap(HttpClient.response.schemaBodyJson(PeerReviewsSchema)),
      Effect.scoped,
    )

    return response.group
  })

export const addPeerReviewToOrcidId = ({
  id,
  peerReview,
}: {
  id: OrcidId
  peerReview: NewPeerReview
}): Effect.Effect<
  void,
  AddPeerReviewToOrcidIdError,
  OrcidConfig | HttpClient.client.Client.Default | OrcidAccessToken
> =>
  Effect.gen(function* (_) {
    const client = yield* _(orcidClient)

    yield* _(
      HttpClient.request.post(`${id}/peer-review`, { headers: { 'Content-Type': 'application/vnd.orcid+json' } }),
      HttpClient.request.schemaBody(NewPeerReviewSchema)(peerReview),
      Effect.flatMap(client),
      Effect.scoped,
    )
  })

export const deletePeerReview = ({
  orcid,
  id,
}: {
  orcid: OrcidId
  id: number
}): Effect.Effect<void, DeletePeerReviewError, OrcidConfig | HttpClient.client.Client.Default | OrcidAccessToken> =>
  Effect.gen(function* (_) {
    const client = yield* _(orcidClient)

    yield* _(HttpClient.request.del(`${orcid}/peer-review/${id}`), client, Effect.scoped)
  })

const PrereviewGroupSchema = Schema.struct({
  'external-ids': Schema.struct({
    'external-id': Schema.tuple(
      Schema.struct({
        'external-id-type': Schema.literal('peer-review'),
        'external-id-value': Schema.literal('orcid-generated:prereview'),
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
})

export type PrereviewGroupSchema = Schema.Schema.Type<typeof PrereviewGroupSchema>

const OtherPeerReviewGroupSchema = Schema.struct({
  'external-ids': Schema.struct({
    'external-id': Schema.tuple(
      Schema.struct({
        'external-id-value': Schema.string,
      }),
    ),
  }),
})

const PeerReviewsSchema = Schema.struct({
  group: Schema.array(Schema.union(PrereviewGroupSchema, OtherPeerReviewGroupSchema)),
})

const NewPeerReviewSchema = Schema.struct({
  'reviewer-role': Schema.literal('reviewer'),
  'review-identifiers': Schema.struct({
    'external-id': Schema.struct({
      'external-id-type': Schema.literal('doi'),
      'external-id-value': DoiSchema,
      'external-id-relationship': Schema.literal('self'),
    }),
  }),
  'review-url': Url.UrlSchema,
  'review-type': Schema.literal('review'),
  'review-completion-date': Schema.transform(
    Schema.struct({
      year: Schema.NumberFromString,
      month: Schema.NumberFromString,
      day: Schema.NumberFromString,
    }),
    Temporal.PlainDateFromSelfSchema,
    ({ year, month, day }) => Temporal.PlainDate.from({ year, month, day }),
    date => ({ year: date.year, month: date.month, day: date.day }),
  ),
  'review-group-id': Schema.literal('orcid-generated:prereview'),
  'subject-external-identifier': Schema.struct({
    'external-id-type': Schema.literal('doi'),
    'external-id-value': DoiSchema,
    'external-id-relationship': Schema.literal('self'),
  }),
  'subject-container-name': Schema.optional(Schema.string),
  'subject-type': Schema.optional(Schema.literal('preprint')),
  'subject-name': Schema.optional(Schema.struct({ title: Schema.string })),
  'subject-url': Url.UrlSchema,
  'convening-organization': Schema.struct({
    name: Schema.string,
    address: Schema.struct({
      city: Schema.string,
      country: Schema.string,
    }),
  }),
})

const orcidClient = Effect.gen(function* (_) {
  const config = yield* _(OrcidConfig)
  const httpClient = yield* _(HttpClient.client.Client)
  const { token } = yield* _(OrcidAccessToken)

  return httpClient.pipe(
    HttpClient.client.filterStatusOk,
    HttpClient.client.mapRequest(HttpClient.request.accept('application/vnd.orcid+json')),
    HttpClient.client.mapRequest(HttpClient.request.prependUrl(new URL('/v3.0/', config.url).href)),
    HttpClient.client.mapRequest(HttpClient.request.bearerToken(token)),
  )
})
