import { describe, expect, it } from 'vitest'
import { canMoveTo, NEXT_STATUSES, STATUSES } from './orderStatus'

describe('order status flow', () => {
  it('only moves forward', () => {
    expect(canMoveTo('Pending', 'Processing')).toBe(true)
    expect(canMoveTo('Processing', 'Shipped')).toBe(true)
    expect(canMoveTo('Shipped', 'Delivered')).toBe(true)
    expect(canMoveTo('Processing', 'Pending')).toBe(false)
    expect(canMoveTo('Delivered', 'Pending')).toBe(false)
  })

  it('allows cancelling only before shipping, where the API keeps stock right', () => {
    expect(canMoveTo('Pending', 'Cancelled')).toBe(true)
    expect(canMoveTo('Processing', 'Cancelled')).toBe(true)
    expect(canMoveTo('Shipped', 'Cancelled')).toBe(false)
  })

  it('treats Delivered, Cancelled and Returned as final', () => {
    expect(NEXT_STATUSES.Delivered).toEqual([])
    expect(NEXT_STATUSES.Cancelled).toEqual([])
    expect(NEXT_STATUSES.Returned).toEqual([])
  })

  it('allows a return only from Shipped (parcel refused at the door)', () => {
    expect(canMoveTo('Shipped', 'Returned')).toBe(true)
    expect(canMoveTo('Delivered', 'Returned')).toBe(false)
    expect(canMoveTo('Processing', 'Returned')).toBe(false)
    expect(canMoveTo('Pending', 'Returned')).toBe(false)
  })

  it('never offers moving to the same status', () => {
    for (const s of STATUSES) expect(NEXT_STATUSES[s]).not.toContain(s)
  })
})

