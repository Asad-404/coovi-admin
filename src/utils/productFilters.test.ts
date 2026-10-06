import { describe, expect, it } from 'vitest'
import { categoriesOf, filterProducts } from './productFilters'
import type { ProductFilters } from './productFilters'
import { makeProduct } from '@/test/fixtures'

const none: ProductFilters = { search: '', category: '', stock: 'all', sort: 'newest' }

const products = [
  makeProduct({ _id: 'a', name: 'Red Saree', slug: 'red-saree', category: 'Saree', price: 3000, stock: 10, createdAt: '2026-01-01' }),
  makeProduct({ _id: 'b', name: 'Blue Kurti', slug: 'blue-kurti', category: 'Kurti', price: 1000, stock: 3, createdAt: '2026-03-01' }),
  makeProduct({ _id: 'c', name: 'Green Saree', slug: 'green-saree', category: 'Saree', price: 2000, stock: 0, createdAt: '2026-02-01' }),
]
const ids = (list: { _id: string }[]) => list.map((p) => p._id)

describe('filterProducts', () => {
  it('sorts newest first by default', () => {
    expect(ids(filterProducts(products, none))).toEqual(['b', 'c', 'a'])
  })

  it('searches by name or slug', () => {
    expect(ids(filterProducts(products, { ...none, search: 'saree' }))).toEqual(['c', 'a'])
    expect(ids(filterProducts(products, { ...none, search: 'blue-k' }))).toEqual(['b'])
  })

  it('filters by category and stock level', () => {
    expect(ids(filterProducts(products, { ...none, category: 'Saree' }))).toEqual(['c', 'a'])
    expect(ids(filterProducts(products, { ...none, stock: 'low' }))).toEqual(['b', 'c'])
    expect(ids(filterProducts(products, { ...none, stock: 'out' }))).toEqual(['c'])
  })

  it('sorts by price', () => {
    expect(ids(filterProducts(products, { ...none, sort: 'price-asc' }))).toEqual(['b', 'c', 'a'])
  })

  it('does not reorder the input array', () => {
    filterProducts(products, { ...none, sort: 'price-asc' })
    expect(ids(products)).toEqual(['a', 'b', 'c'])
  })
})

describe('categoriesOf', () => {
  it('lists each category once, sorted', () => {
    expect(categoriesOf(products)).toEqual(['Kurti', 'Saree'])
  })
})
