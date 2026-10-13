import { describe, expect, it } from 'vitest'
import { hasPreorder, itemLabel } from './preorder'

describe('itemLabel', () => {
  it('keeps the plain name for a stock line', () => {
    expect(itemLabel({ name: 'Red Katan' })).toBe('Red Katan')
    expect(itemLabel({ name: 'Red Katan', preorder: false, preorderDays: 15 })).toBe('Red Katan')
  })

  it('marks a pre-order line with its wait', () => {
    expect(itemLabel({ name: 'Red Katan', preorder: true, preorderDays: 15 })).toBe('Red Katan (pre-order, about 15 days)')
    expect(itemLabel({ name: 'Red Katan', preorder: true })).toBe('Red Katan (pre-order)')
  })
})

describe('hasPreorder', () => {
  it('is true only when a line is a pre-order', () => {
    expect(hasPreorder({ items: [] })).toBe(false)
    expect(hasPreorder({ items: [{ name: 'a', price: 1, quantity: 1, image: '', productId: 'x' }] })).toBe(false)
    expect(
      hasPreorder({ items: [{ name: 'a', price: 1, quantity: 1, image: '', productId: 'x', preorder: true }] }),
    ).toBe(true)
  })
})
