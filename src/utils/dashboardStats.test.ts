import { describe, expect, it } from 'vitest'
import { countByStatus, dailyRevenue, lowStockProducts, revenueOf } from './dashboardStats'
import { makeOrder, makeProduct } from '@/test/fixtures'

describe('revenueOf', () => {
  it('leaves out cancelled orders', () => {
    const orders = [
      makeOrder({ total: 1000, status: 'Delivered' }),
      makeOrder({ total: 500, status: 'Pending' }),
      makeOrder({ total: 9999, status: 'Cancelled' }),
    ]
    expect(revenueOf(orders)).toBe(1500)
  })
})

describe('countByStatus', () => {
  it('counts every status, including zero', () => {
    const counts = countByStatus([makeOrder({ status: 'Pending' }), makeOrder({ status: 'Pending' }), makeOrder({ status: 'Shipped' })])
    expect(counts).toEqual({ Pending: 2, Processing: 0, Shipped: 1, Delivered: 0, Cancelled: 0 })
  })
})

describe('lowStockProducts', () => {
  it('keeps products under the threshold, lowest first', () => {
    const list = lowStockProducts([
      makeProduct({ _id: 'a', stock: 5 }),
      makeProduct({ _id: 'b', stock: 6 }),
      makeProduct({ _id: 'c', stock: 0 }),
    ])
    expect(list.map((p) => p._id)).toEqual(['c', 'a'])
  })
})

describe('dailyRevenue', () => {
  it('buckets the last N local days, oldest first, without cancelled orders', () => {
    const now = new Date(2026, 9, 6, 15)
    const days = dailyRevenue(
      [
        makeOrder({ total: 100, createdAt: new Date(2026, 9, 6, 9).toISOString() }),
        makeOrder({ total: 50, createdAt: new Date(2026, 9, 6, 11).toISOString() }),
        makeOrder({ total: 70, createdAt: new Date(2026, 9, 4, 9).toISOString() }),
        makeOrder({ total: 999, status: 'Cancelled', createdAt: new Date(2026, 9, 6, 9).toISOString() }),
        makeOrder({ total: 999, createdAt: new Date(2026, 8, 1).toISOString() }),
      ],
      3,
      now,
    )
    expect(days).toEqual([
      { date: '2026-10-04', revenue: 70, orders: 1 },
      { date: '2026-10-05', revenue: 0, orders: 0 },
      { date: '2026-10-06', revenue: 150, orders: 2 },
    ])
  })
})
