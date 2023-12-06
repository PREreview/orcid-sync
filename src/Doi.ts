import { Schema } from '@effect/schema'
import doiRegex from 'doi-regex'
import { Brand, type Predicate } from 'effect'

export type Doi = Brand.Branded<string, 'Doi'>

const isDoi: Predicate.Refinement<unknown, Doi> = (u): u is Doi =>
  typeof u === 'string' && doiRegex({ exact: true }).test(u) && !u.endsWith('/.') && !u.endsWith('/..')

export const Doi = Brand.refined<Doi>(isDoi, s => Brand.error(`Expected ${s} to be a DOI`))

export const DoiSchema = Schema.string.pipe(Schema.fromBrand(Doi))
