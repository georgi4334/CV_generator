import { i18n } from '@/i18n'
import { toApiRequestError } from './client'

/**
 * A message for the user in the interface language: the translation of the
 * error's code when there is one, else the server's own message.
 */
export function errorMessage(error: unknown): string {
  const { code, message } = toApiRequestError(error)
  const key = `errors.${code}`
  return i18n.exists(key) ? i18n.t(key as 'errors.not_found') : message
}
