import { describe, expect, it } from 'vitest'
import { dhakaToday, lowStockProducts, percent, rangeFor, rangeProblem } from './dashboardStats'
import { makeProduct } from '@/test/fixtures'

describe('lowStockProducts', () => {
  it('keeps products under the threshold, lowest first', () => {
    const list = lowStockProducts([
      makeProduct({ _id: 'a', stock: 5 }),
      makeProduct({ _id: 'b', stock: 6 }),
      makeProduct({ _id: 'c', stock: 0 }),
    ])
    expect(list.map((p) => p._id)).toEqual(['c', 'a'])
  })

  it('uses the low-stock limit saved in settings when given', () => {
    const products = [makeProduct({ _id: 'a', stock: 5 }), makeProduct({ _id: 'b', stock: 12 })]
    expect(lowStockProducts(products, 3).map((p) => p._id)).toEqual([])
    expect(lowStockProducts(products, 15).map((p) => p._id)).toEqual(['a', 'b'])
  })
})

describe('dhakaToday', () => {
  it('is already tomorrow in Bangladesh late in the UTC evening', () => {
    expect(dhakaToday(new Date('2026-10-15T17:59:00Z'))).toBe('2026-10-15')
    expect(dhakaToday(new Date('2026-10-15T18:00:00Z'))).toBe('2026-10-16')
  })
})

describe('rangeFor', () => {
  const now = new Date('2026-10-15T06:00:00Z')

  it('counts today in every preset', () => {
    expect(rangeFor('today', now)).toEqual({ from: '2026-10-15', to: '2026-10-15' })
    expect(rangeFor('7d', now)).toEqual({ from: '2026-10-09', to: '2026-10-15' })
    expect(rangeFor('30d', now)).toEqual({ from: '2026-09-16', to: '2026-10-15' })
    expect(rangeFor('month', now)).toEqual({ from: '2026-10-01', to: '2026-10-15' })
  })

  it('crosses a year end', () => {
    expect(rangeFor('7d', new Date('2027-01-02T06:00:00Z'))).toEqual({ from: '2026-12-27', to: '2027-01-02' })
  })
})

describe('rangeProblem', () => {
  it('accepts a normal range', () => {
    expect(rangeProblem({ from: '2026-10-01', to: '2026-10-15' })).toBeNull()
    expect(rangeProblem({ from: '2026-01-01', to: '2026-12-31' })).toBeNull()
  })

  it('explains what is wrong', () => {
    expect(rangeProblem({ from: '', to: '2026-10-15' })).toBe('Pick both dates')
    expect(rangeProblem({ from: '2026-10-16', to: '2026-10-15' })).toMatch(/on or before/)
    expect(rangeProblem({ from: '2025-01-01', to: '2026-10-15' })).toMatch(/at most 366/)
  })
})

describe('percent', () => {
  it('rounds and handles nothing to divide by', () => {
    expect(percent(1, 3)).toBe('33%')
    expect(percent(0, 0)).toBe('–')
  })
})
