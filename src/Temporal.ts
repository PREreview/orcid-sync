import { ParseResult, Schema } from '@effect/schema'
import { Temporal } from '@js-temporal/polyfill'

export type PlainDate = Temporal.PlainDate

export const { PlainDate } = Temporal

export const PlainDateFromSelfSchema = Schema.instanceOf(Temporal.PlainDate)

export const PlainDateFromStringSchema = <R, I, A extends string>(
  self: Schema.Schema<R, I, A>,
): Schema.Schema<R, I, Temporal.PlainDate> =>
  Schema.transformOrFail(
    self,
    PlainDateFromSelfSchema,
    (s, _, ast) =>
      ParseResult.try({
        try: () => Temporal.PlainDate.from(s),
        catch: () => ParseResult.type(ast, s),
      }),
    plainDate => ParseResult.succeed(plainDate.toString()),
    { strict: false },
  )

export const PlainDateSchema = PlainDateFromStringSchema(Schema.string)
