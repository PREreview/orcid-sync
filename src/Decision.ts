import { Data } from 'effect'
import type { Doi } from './Doi.js'
import type { User } from './Users.js'

export type Decision = Data.TaggedEnum<{
  AddReviewToProfile: { user: User; doi: Doi }
  RemoveReviewFromProfile: { user: User; id: number }
}>

export type RemoveReviewFromProfile = Extract<Decision, { _tag: 'RemoveReviewFromProfile' }>

export const { AddReviewToProfile, RemoveReviewFromProfile } = Data.taggedEnum<Decision>()
