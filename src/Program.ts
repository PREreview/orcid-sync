import { Effect, Stream } from 'effect'
import type * as OrcidId from './OrcidId.js'
import * as Users from './Users.js'

const processUser = (orcidId: OrcidId.OrcidId) =>
  Effect.logInfo('Processing user').pipe(Effect.annotateLogs('orcidId', orcidId))

export const program = Users.getUsers.pipe(Stream.runForEach(processUser))
