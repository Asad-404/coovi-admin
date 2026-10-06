const TOKEN_KEY = 'admin_token'

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY)
export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY)

// Reads the JWT's exp claim (seconds) without verifying it — only to skip a
// doomed page load. The API still verifies every token.
export const isTokenExpired = (token: string, now = Date.now()): boolean => {
  try {
    const payload = token.split('.')[1]
    if (!payload) return true
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const { exp } = JSON.parse(json) as { exp?: number }
    return typeof exp === 'number' && exp * 1000 <= now
  } catch {
    return true
  }
}

// A stored token that is present and not past its expiry
export const hasUsableToken = (): boolean => {
  const token = getToken()
  if (!token) return false
  if (isTokenExpired(token)) {
    clearToken()
    return false
  }
  return true
}
