import { describe, expect, it } from 'vitest'
import { isTokenExpired } from './auth'

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
