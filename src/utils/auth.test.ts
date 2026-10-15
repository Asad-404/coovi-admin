import { describe, expect, it } from 'vitest'
import { getTokenAdminId, getTokenRole, isOwner, isTokenExpired } from './auth'

const tokenWith = (payload: object): string => {
  const body = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `header.${body}.signature`
}

describe('isTokenExpired', () => {
  const now = Date.UTC(2026, 9, 6)

  it('is false before exp', () => {
    expect(isTokenExpired(tokenWith({ exp: now / 1000 + 60 }), now)).toBe(false)
  })

  it('is true at or after exp', () => {
    expect(isTokenExpired(tokenWith({ exp: now / 1000 }), now)).toBe(true)
    expect(isTokenExpired(tokenWith({ exp: now / 1000 - 60 }), now)).toBe(true)
  })

  it('leaves tokens without exp to the API', () => {
    expect(isTokenExpired(tokenWith({ id: 'a' }), now)).toBe(false)
  })

  it('treats garbage as expired', () => {
    expect(isTokenExpired('not-a-jwt', now)).toBe(true)
    expect(isTokenExpired('a.%%%.b', now)).toBe(true)
  })
})

describe('token role', () => {
  it('reads the role and id from the token', () => {
    const token = tokenWith({ id: 'abc', role: 'staff' })
    expect(getTokenRole(token)).toBe('staff')
    expect(getTokenAdminId(token)).toBe('abc')
    expect(isOwner(token)).toBe(false)
  })

  it('is an owner only with the owner role', () => {
    expect(isOwner(tokenWith({ role: 'owner' }))).toBe(true)
    // Tokens from before roles existed are refused by the API, so don't show owner screens
    expect(isOwner(tokenWith({ role: 'admin' }))).toBe(false)
  })

  it('has no role without a readable token', () => {
    expect(getTokenRole(null)).toBeNull()
    expect(getTokenRole('not-a-jwt')).toBeNull()
    expect(getTokenAdminId('a.%%%.b')).toBeNull()
    expect(isOwner(null)).toBe(false)
  })
})
