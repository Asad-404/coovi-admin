import { describe, expect, it } from 'vitest'
import { makeOrder } from '@/test/fixtures'
import { countPending, mergeOrders, syncSince } from './orderSync'

const older = makeOrder({ _id: 'a', createdAt: '2026-10-01T10:00:00.000Z' })
const newer = makeOrder({ _id: 'b', createdAt: '2026-10-02T10:00:00.000Z' })

describe('mergeOrders', () => {
  it('replaces a changed order in place of its old copy', () => {
    const cancelled = { ...older, status: 'Cancelled' as const }

    const merged = mergeOrders([newer, older], [cancelled])

    expect(merged).toHaveLength(2)
    expect(merged.find((o) => o._id === 'a')?.status).toBe('Cancelled')
  })

  it('adds a new order at the top', () => {
    const fresh = makeOrder({ _id: 'c', createdAt: '2026-10-03T10:00:00.000Z' })

    expect(mergeOrders([newer, older], [fresh]).map((o) => o._id)).toEqual(['c', 'b', 'a'])
  })

  it('keeps the same list when nothing changed', () => {
    const list = [newer, older]

    expect(mergeOrders(list, [])).toBe(list)
  })
})

describe('syncSince', () => {
  it('reaches 5 seconds back past the last server time', () => {
    expect(syncSince('2026-10-13T07:45:00.000Z')).toBe('2026-10-13T07:44:55.000Z')
  })
})

describe('countPending', () => {
  it('counts only Pending orders', () => {
    expect(countPending([older, { ...newer, status: 'Shipped' }])).toBe(1)
  })
})
