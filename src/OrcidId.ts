import { Schema } from '@effect/schema'
import { Brand } from 'effect'
import { isOrcid } from 'orcid-id-ts'

export type OrcidId = Brand.Branded<string, 'OrcidId'>

export const OrcidId = Brand.refined<OrcidId>(isOrcid, s => Brand.error(`Expected ${s} to be an ORCID iD`))

export const OrcidIdSchema = Schema.string.pipe(Schema.fromBrand(OrcidId))
