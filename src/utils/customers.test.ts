import { describe, expect, it } from 'vitest'
import { blockLabel, customerSummary } from './customers'

describe('customerSummary', () => {
  it('lists only the parts that happened', () => {
    expect(customerSummary({ orders: 4, delivered: 2, returned: 1, cancelled: 1 })).toBe(
      '4 orders: 2 delivered, 1 refused, 1 cancelled',
    )
    expect(customerSummary({ orders: 1, delivered: 1, returned: 0, cancelled: 0 })).toBe('1 order: 1 delivered')
  })

  it('shows just the count when nothing has finished yet', () => {
    expect(customerSummary({ orders: 2, delivered: 0, returned: 0, cancelled: 0 })).toBe('2 orders')
    expect(customerSummary({ orders: 0, delivered: 0, returned: 0, cancelled: 0 })).toBe('0 orders')
  })
})

describe('blockLabel', () => {
  it('adds the note when there is one', () => {
    expect(blockLabel('Refused twice')).toBe('Blocked: Refused twice')
    expect(blockLabel()).toBe('Blocked')
  })
})
