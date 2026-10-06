import type { Order, Product } from '@/types'

export const makeOrder = (overrides: Partial<Order> = {}): Order => ({
  _id: 'o1',
  orderNumber: 'ORD-20261001-001',
  customerName: 'Rahima Begum',
  phone: '01711111111',
  address: 'House 1, Road 2, Dhaka',
  items: [{ productId: 'p1', name: 'Jamdani Saree', price: 1000, quantity: 2, image: 'a.jpg' }],
  subtotal: 2000,
  deliveryFee: 60,
  total: 2060,
  paymentMethod: 'Cash on Delivery',
  status: 'Pending',
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
  ...overrides,
})

export const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  _id: 'p1',
  slug: 'jamdani-saree',
  name: 'Jamdani Saree',
  price: 1000,
  images: ['a.jpg'],
  category: 'Saree',
  stock: 10,
  inStock: true,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  ...overrides,
})
