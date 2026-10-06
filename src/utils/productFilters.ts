import { LOW_STOCK_THRESHOLD } from '@/constants'
import type { Product } from '@/types'

export type ProductSort = 'newest' | 'name-asc' | 'price-asc' | 'price-desc' | 'stock-asc'
export type StockFilter = 'all' | 'low' | 'out'

export interface ProductFilters {
  search: string
  category: string // '' = all
  stock: StockFilter
  sort: ProductSort
}

const compare: Record<ProductSort, (a: Product, b: Product) => number> = {
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  'name-asc': (a, b) => a.name.localeCompare(b.name),
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  'stock-asc': (a, b) => a.stock - b.stock,
}

export const filterProducts = (products: Product[], { search, category, stock, sort }: ProductFilters): Product[] => {
  const term = search.trim().toLowerCase()
  return products
    .filter((p) => {
      const matchesSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.slug.includes(term) ||
        (p.nameBn ?? '').includes(search.trim())
      const matchesCategory = !category || p.category === category
      const matchesStock =
        stock === 'all' || (stock === 'out' ? p.stock === 0 : p.stock < LOW_STOCK_THRESHOLD)
      return matchesSearch && matchesCategory && matchesStock
    })
    .sort(compare[sort])
}

export const categoriesOf = (products: Product[]): string[] =>
  [...new Set(products.map((p) => p.category))].sort()
