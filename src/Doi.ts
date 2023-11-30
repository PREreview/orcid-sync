import { Schema } from '@effect/schema'
import doi from 'doi-ts'
import { Brand } from 'effect'

export type Doi = Brand.Branded<string, 'Doi'>

export const Doi = Brand.refined<Doi>(doi.isDoi, s => Brand.error(`Expected ${s} to be a DOI`))

export const DoiSchema = Schema.string.pipe(Schema.fromBrand(Doi))
