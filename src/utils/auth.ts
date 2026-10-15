const TOKEN_KEY = 'admin_token'

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY)
export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY)

// Reads a JWT's claims without verifying them; null when it isn't a readable token.
// Only for showing the right screens: the API verifies every token.
const readClaims = (token: string): { exp?: number; role?: string; id?: string } | null => {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return null
  }
}

// Reads the JWT's exp claim (seconds) to skip a doomed page load
export const isTokenExpired = (token: string, now = Date.now()): boolean => {
  const claims = readClaims(token)
  if (!claims) return true
  return typeof claims.exp === 'number' && claims.exp * 1000 <= now
}

// The signed-in account's role. A role change signs the account out on the API,
// so the role in a working token is always the current one.
export const getTokenRole = (token: string | null = getToken()): string | null =>
  (token && readClaims(token)?.role) || null

// The signed-in account's id, to mark "you" on the Team page
export const getTokenAdminId = (token: string | null = getToken()): string | null =>
  (token && readClaims(token)?.id) || null

// Owners see money, settings, the team and product delete; staff don't.
// The API refuses those requests for staff too.
export const isOwner = (token: string | null = getToken()): boolean => getTokenRole(token) === 'owner'

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
