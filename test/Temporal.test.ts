import { Schema } from '@effect/schema'
import { test } from '@fast-check/vitest'
import { Either } from 'effect'
import { describe, expect } from 'vitest'
import * as _ from '../src/Temporal.js'
import * as fc from './fc.js'

describe('PlainDateFromSelfSchema', () => {
  describe('decoding', () => {
    test.prop([fc.plainDate()])('with a PlainDate', plainDate => {
      const actual = Schema.parseSync(_.PlainDateFromSelfSchema)(plainDate)

      expect(actual).toStrictEqual(plainDate)
    })

    test.prop([fc.anything()])('with a non-PlainDate', value => {
      const actual = Schema.parseEither(_.PlainDateFromSelfSchema)(value)

      expect(actual).toStrictEqual(Either.left(expect.anything()))
    })
  })

  test.prop([fc.plainDate()])('encoding', plainDate => {
    const actual = Schema.encodeSync(_.PlainDateFromSelfSchema)(plainDate)

    expect(actual).toStrictEqual(plainDate)
  })
})

describe('PlainDateSchema', () => {
  describe('decoding', () => {
    test.prop([fc.plainDate()])('with a date string', plainDate => {
      const actual = Schema.parseSync(_.PlainDateSchema)(plainDate.toString())

      expect(actual).toStrictEqual(plainDate)
    })

    test.prop([
      fc.anything().filter(value => typeof value !== 'string' || !/^[-+]?[0-9]+-[0-9]{2}-[0-9]{2}$/.test(value)),
    ])('with a non-date-string', value => {
      const actual = Schema.parseEither(_.PlainDateSchema)(value)

      expect(actual).toStrictEqual(Either.left(expect.anything()))
    })
  })

  test.prop([fc.plainDate()])('encoding', plainDate => {
    const actual = Schema.encodeSync(_.PlainDateSchema)(plainDate)

    expect(actual).toStrictEqual(plainDate.toString())
  })
})
