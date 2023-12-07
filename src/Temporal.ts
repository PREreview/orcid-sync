import { ParseResult, Schema } from '@effect/schema'
import { Temporal } from '@js-temporal/polyfill'

export const PlainDateSchema = Schema.instanceOf(Temporal.PlainDate)

export const PlainDataFromStringSchema = <I, A extends string>(
  self: Schema.Schema<I, A>,
): Schema.Schema<I, Temporal.PlainDate> =>
  Schema.transformOrFail(
    self,
    PlainDateSchema,
    (s, _, ast) =>
      ParseResult.try({
        try: () => Temporal.PlainDate.from(s),
        catch: () => ParseResult.parseError([ParseResult.type(ast, s)]),
      }),
    plainDate => ParseResult.success(plainDate.toString()),
    { strict: false },
  )
