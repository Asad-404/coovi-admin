import { getErrorMessage as getStructuredErrorMessage } from '@/errors'

/**
 * @deprecated Use getErrorMessage from @/errors instead
 * Kept for backward compatibility
 *
 * Turns an API/network error into a message for the admin. Prefers the API's
 * validation details, then its message, then the given fallback.
 */
export const getErrorMessage = (err: unknown, fallback: string): string => {
  return getStructuredErrorMessage(err, fallback)
}
