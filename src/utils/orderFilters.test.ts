import { describe, expect, it } from 'vitest'
import { filterOrders } from './orderFilters'
import type { OrderFilters } from './orderFilters'
import { makeOrder } from '@/test/fixtures'

const none: OrderFilters = { search: '', status: 'All', from: '', to: '' }

const orders = [
  makeOrder({ _id: 'a', orderNumber: 'ORD-1', customerName: 'Rahima', phone: '01711111111', status: 'Pending', createdAt: '2026-10-01T06:00:00' }),
  makeOrder({ _id: 'b', orderNumber: 'ORD-2', customerName: 'Karim', phone: '01822222222', status: 'Delivered', createdAt: '2026-10-03T06:00:00' }),
  makeOrder({ _id: 'c', orderNumber: 'ORD-3', customerName: 'Nasrin', phone: '01933333333', status: 'Pending', createdAt: '2026-10-05T23:30:00' }),
]
const ids = (list: { _id: string }[]) => list.map((o) => o._id)

describe('filterOrders', () => {
  it('returns everything with no filters', () => {
    expect(ids(filterOrders(orders, none))).toEqual(['a', 'b', 'c'])
  })

  it('searches order number, name (any case) and phone', () => {
    expect(ids(filterOrders(orders, { ...none, search: 'ord-2' }))).toEqual(['b'])
    expect(ids(filterOrders(orders, { ...none, search: 'NASRIN' }))).toEqual(['c'])
    expect(ids(filterOrders(orders, { ...none, search: '0171' }))).toEqual(['a'])
  })

  it('filters by status', () => {
    expect(ids(filterOrders(orders, { ...none, status: 'Pending' }))).toEqual(['a', 'c'])
  })

  it('includes whole days at both ends of the date range', () => {
    expect(ids(filterOrders(orders, { ...none, from: '2026-10-03', to: '2026-10-05' }))).toEqual(['b', 'c'])
    expect(ids(filterOrders(orders, { ...none, to: '2026-10-01' }))).toEqual(['a'])
  })
})
