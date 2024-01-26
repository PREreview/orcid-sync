import { Temporal } from '@js-temporal/polyfill'
import doiRegex from 'doi-regex'
import * as fc from 'fast-check'
import type * as Doi from '../src/Doi.js'

export * from 'fast-check'

export const plainDate = (): fc.Arbitrary<Temporal.PlainDate> =>
  fc
    .record({
      year: fc.integer({ min: -271820, max: 275759 }),
      month: fc.integer({ min: 1, max: 12 }),
      day: fc.integer({ min: 1, max: 31 }),
    })
    .map(args => Temporal.PlainDate.from(args))

export const doi = ({ suffix }: { suffix?: fc.Arbitrary<string> } = {}): fc.Arbitrary<Doi.Doi> =>
  fc
    .tuple(doiRegistrant(), suffix ?? fc.unicodeString({ minLength: 1 }))
    .map(([prefix, suffix]) => `10.${prefix}/${suffix}` as Doi.Doi)
    .filter(s => doiRegex({ exact: true }).test(s) && !s.endsWith('/.') && !s.endsWith('/..'))

const doiRegistrant = (): fc.Arbitrary<string> =>
  fc
    .tuple(
      fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 2 }),
      fc.array(fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 1 })),
    )
    .map(([one, two]) => [one, ...two].join('.'))
