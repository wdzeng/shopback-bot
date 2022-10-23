import { AxiosError } from 'axios'
import { stringify } from './json'
import * as logger from './logger'
import {
  InvalidCredentialFileException,
  UserNotInTaiwanException,
  UserNotLoggedInException,
} from '../lang/errors'
import * as ExitCode from '../lang/exit-code'

export function handleError(e: unknown): never {
  if (e instanceof InvalidCredentialFileException) {
    logger.error(e.message)
    process.exit(ExitCode.INVALID_CREDENTIAL)
  }

  if (e instanceof UserNotInTaiwanException) {
    logger.error(e.message)
    process.exit(ExitCode.USER_NOT_IN_TAIWAN)
  }

  if (e instanceof UserNotLoggedInException) {
    logger.error(e.message)
    process.exit(ExitCode.FAILED_TO_LOGIN)
  }

  if (e instanceof AxiosError) {
    logger.error(
      'Failed to communicate with Shopback server: ' +
        stringify(e.response?.data)
    )
    logger.debug('Status code: ' + stringify(e.status))
    logger.debug('Shopback server response: ' + stringify(e.response?.data))
    process.exit(ExitCode.API_ERROR)
  }

  if (e instanceof Error) {
    console.error(e.message)
    process.exit(ExitCode.UNKNOWN_ERROR)
  }

  logger.error('Unknown error occurred.')
  logger.debug('Error object: ' + stringify(e))
  process.exit(ExitCode.UNKNOWN_ERROR)
}
