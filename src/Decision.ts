import { Data } from 'effect'
import type { Doi } from './Doi.js'
import type * as Temporal from './Temporal.js'
import type { User } from './Users.js'

export type Decision = Data.TaggedEnum<{
  AddReviewToProfile: { user: User; doi: Doi; preprintDoi: Doi; publicationDate: Temporal.PlainDate }
  RemoveReviewFromProfile: { user: User; id: number }
}>

export type RemoveReviewFromProfile = Extract<Decision, { _tag: 'RemoveReviewFromProfile' }>

export const { AddReviewToProfile, RemoveReviewFromProfile } = Data.taggedEnum<Decision>()
