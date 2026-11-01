import { describe, expect, it } from 'vitest'
import { phoneScreen } from './phoneScreen'

describe('phoneScreen', () => {
  it('names the main pages without a back arrow', () => {
    expect(phoneScreen('/orders')).toEqual({ title: 'Orders' })
    expect(phoneScreen('/dashboard')).toEqual({ title: 'Coovi' })
  })

  it('treats forms as tasks that go back to their list', () => {
    expect(phoneScreen('/orders/new')).toEqual({ title: 'Add order', back: '/orders' })
    expect(phoneScreen('/products/new')).toEqual({ title: 'Add product', back: '/products' })
    expect(phoneScreen('/products/red-silk/edit')).toEqual({ title: 'Edit product', back: '/products' })
  })
})
