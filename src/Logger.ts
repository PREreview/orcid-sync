import chalk from 'chalk'
import { Cause, LogSpan, Logger } from 'effect'

export const SimpleLogger: Logger.Logger<unknown, void> = Logger.make(
  ({ annotations, cause, date, logLevel, message, spans }) => {
    const nowMillis = date.getTime()

    const outputArray: Array<string> = [logLevel.label]

    const stringMessage = serializeUnknown(message)

    if (stringMessage.length > 0) {
      outputArray.push(quote(stringMessage))
    }

    if (!Cause.isEmptyType(cause)) {
      outputArray.push(Cause.pretty(cause))
    }

    for (const span of spans) {
      outputArray.push(LogSpan.render(nowMillis)(span))
    }

    for (const [key, value] of annotations) {
      outputArray.push(`${filterKeyName(key)}=${quote(serializeUnknown(value))}`)
    }

    const output = outputArray.join(' ')

    if (logLevel._tag === 'Debug') {
      globalThis.console.log(chalk.gray(output))
    } else {
      globalThis.console.log(output)
    }
  },
)

export const serializeUnknown = (u: unknown): string => {
  try {
    return typeof u === 'object' ? JSON.stringify(u) : String(u)
  } catch (_) {
    return String(u)
  }
}

const escapeDoubleQuotes = (str: string) => `"${str.replace(/\\([\s\S])|(")/g, '\\$1$2')}"`

const textOnly = /^[^\s"=]+$/

const quote = (label: string): string => (label.match(textOnly) ? label : escapeDoubleQuotes(label))

const filterKeyName = (key: string) => key.replace(/[\s="]/g, '_')
