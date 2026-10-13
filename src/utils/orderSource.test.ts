import { describe, expect, it } from 'vitest'
import { orderSource, previewTotals } from './orderSource'

describe('orderSource', () => {
  it('reads an order without a source as a website order', () => {
    expect(orderSource({})).toBe('website')
    expect(orderSource({ source: 'phone' })).toBe('phone')
  })
})

describe('previewTotals', () => {
  it('adds the lines and the delivery fee and takes off the discount', () => {
    expect(
      previewTotals(
        [
          { price: 3000, quantity: 2 },
          { price: 1200, quantity: 1 },
        ],
        80,
        500,
      ),
    ).toEqual({ subtotal: 7200, discount: 500, deliveryFee: 80, total: 6780 })
  })

  it('is just the fee with no lines', () => {
    expect(previewTotals([], 60, 0).total).toBe(60)
  })
})
