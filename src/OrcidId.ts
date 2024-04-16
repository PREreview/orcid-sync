import { Schema } from '@effect/schema'
import { Brand, type Predicate } from 'effect'
import orcidUtils from 'orcid-utils'

export type OrcidId = Brand.Branded<string, 'OrcidId'>

const isOrcid: Predicate.Refinement<unknown, OrcidId> = (u): u is OrcidId => {
  try {
    return typeof u === 'string' && orcidUtils.toDashFormat(u) === u
  } catch {
    return false
  }
}

export const OrcidId = Brand.refined<OrcidId>(isOrcid, s => Brand.error(`Expected ${s} to be an ORCID iD`))

export const OrcidIdSchema = Schema.String.pipe(Schema.fromBrand(OrcidId))
