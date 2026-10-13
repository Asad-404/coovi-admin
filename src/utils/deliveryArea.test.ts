import { describe, expect, it } from 'vitest'
import { describeDelivery, orderArea } from './deliveryArea'
import { makeOrder } from '@/test/fixtures'

describe('orderArea', () => {
  it('treats an old order without an area as inside Dhaka', () => {
    expect(orderArea(makeOrder())).toBe('inside_dhaka')
    expect(orderArea(makeOrder({ deliveryArea: 'outside_dhaka' }))).toBe('outside_dhaka')
  })
})

describe('describeDelivery', () => {
  it('names Dhaka city and suburbs', () => {
    expect(describeDelivery(makeOrder({ district: 'Dhaka', deliveryArea: 'inside_dhaka' }))).toBe('Dhaka city')
    expect(describeDelivery(makeOrder({ district: 'Dhaka', deliveryArea: 'outside_dhaka' }))).toBe('Dhaka suburbs')
  })

  it('names other districts and old orders', () => {
    expect(describeDelivery(makeOrder({ district: 'Sylhet', deliveryArea: 'outside_dhaka' }))).toBe('Sylhet (outside Dhaka)')
    expect(describeDelivery(makeOrder())).toBe('Inside Dhaka (no district)')
  })
})
