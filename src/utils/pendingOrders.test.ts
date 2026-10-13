import { describe, expect, it } from 'vitest'
import { pendingTitle } from './pendingOrders'

describe('pendingTitle', () => {
  it('shows the waiting count in the tab title', () => {
    expect(pendingTitle(3)).toBe('(3) Coovi Admin')
  })

  it('shows the plain title when nothing is waiting', () => {
    expect(pendingTitle(0)).toBe('Coovi Admin')
  })
})
