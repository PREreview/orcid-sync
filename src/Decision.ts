import { Data } from 'effect'
import type { Doi } from './Doi.js'
import type { OrcidId } from './OrcidId.js'

export type Decision = Data.TaggedEnum<{
  AddReviewToProfile: { orcidId: OrcidId; doi: Doi }
  RemoveReviewFromProfile: { orcidId: OrcidId; doi: Doi }
}>

export const { AddReviewToProfile, RemoveReviewFromProfile } = Data.taggedEnum<Decision>()
