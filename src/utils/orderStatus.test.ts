import { describe, expect, it } from 'vitest'
import { makeOrder } from '@/test/fixtures'
import { canMoveTo, daysSinceDelivery, isPastReturnWindow, NEXT_STATUSES, RETURN_WINDOW_DAYS, STATUSES } from './orderStatus'

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

  it('treats Cancelled and Returned as final', () => {
    expect(NEXT_STATUSES.Cancelled).toEqual([])
    expect(NEXT_STATUSES.Returned).toEqual([])
  })

  it('allows a return from Shipped (refused parcel) or Delivered, never before shipping', () => {
    expect(canMoveTo('Shipped', 'Returned')).toBe(true)
    expect(canMoveTo('Delivered', 'Returned')).toBe(true)
    expect(canMoveTo('Processing', 'Returned')).toBe(false)
    expect(canMoveTo('Pending', 'Returned')).toBe(false)
  })

  it('never offers moving to the same status', () => {
    for (const s of STATUSES) expect(NEXT_STATUSES[s]).not.toContain(s)
  })
})

describe('return window', () => {
  const now = new Date(2026, 9, 20, 12)
  const deliveredDaysAgo = (days: number) =>
    makeOrder({ status: 'Delivered', deliveredAt: new Date(now.getTime() - days * 86_400_000).toISOString() })

  it('counts whole days since delivery', () => {
    expect(daysSinceDelivery(deliveredDaysAgo(3), now)).toBe(3)
  })

  it('warns only after the window has passed', () => {
    expect(isPastReturnWindow(deliveredDaysAgo(RETURN_WINDOW_DAYS), now)).toBe(false)
    expect(isPastReturnWindow(deliveredDaysAgo(RETURN_WINDOW_DAYS + 1), now)).toBe(true)
  })

  it('does not warn when the delivery date is unknown', () => {
    const order = makeOrder({ status: 'Delivered' })
    expect(daysSinceDelivery(order, now)).toBeNull()
    expect(isPastReturnWindow(order, now)).toBe(false)
  })
})
