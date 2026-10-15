import { describe, it, expect } from 'vitest'
import { canBookCourier, courierStatusLabel, steadfastTrackingUrl } from './courier'
import { makeOrder } from '@/test/fixtures'

describe('steadfastTrackingUrl', () => {
  it('links to the public Steadfast tracking page', () => {
    expect(steadfastTrackingUrl('15BAEB8A')).toBe('https://steadfast.com.bd/t/15BAEB8A')
  })

  it('encodes unexpected characters', () => {
    expect(steadfastTrackingUrl('a/b')).toBe('https://steadfast.com.bd/t/a%2Fb')
  })
})

describe('canBookCourier', () => {
  it('allows a Processing order that is not booked yet', () => {
    expect(canBookCourier(makeOrder({ status: 'Processing' }))).toBe(true)
  })

  it('refuses other statuses', () => {
    for (const status of ['Pending', 'Shipped', 'Delivered', 'Cancelled'] as const) {
      expect(canBookCourier(makeOrder({ status }))).toBe(false)
    }
  })

  it('refuses an order that already has a tracking code', () => {
    expect(
      canBookCourier(makeOrder({ status: 'Processing', courier: { name: 'Steadfast', trackingCode: 'X1' } })),
    ).toBe(false)
  })
})

describe('courierStatusLabel', () => {
  it('turns known Steadfast codes into plain words', () => {
    expect(courierStatusLabel('in_review')).toBe('Waiting for Steadfast to review')
    expect(courierStatusLabel('delivered')).toBe('Delivered')
  })

  it('shows unknown codes readably', () => {
    expect(courierStatusLabel('new_status_code')).toBe('new status code')
  })

  it('handles a missing status', () => {
    expect(courierStatusLabel(undefined)).toBe('Not checked yet')
  })
})
