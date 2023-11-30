import { Stream } from 'effect'
import * as OrcidId from './OrcidId.js'

export const getUsers = Stream.fromIterable([OrcidId.OrcidId('0000-0001-8778-8651')])
