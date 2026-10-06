import axios from 'axios'

// Turns an API/network error into a message for the admin. Prefers the API's
// validation details, then its message, then the given fallback.
export const getErrorMessage = (err: unknown, fallback: string): string => {
  if (axios.isAxiosError(err)) {
    if (!err.response) return `${fallback} — is the API running?`
    const details: string[] | undefined = err.response.data?.errors
    if (details?.length) return details.join(', ')
    return err.response.data?.message ?? fallback
  }
  return fallback
}
