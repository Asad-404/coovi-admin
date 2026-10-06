import { describe, expect, it } from 'vitest'
import { formatPrice, slugify } from './format'

describe('formatPrice', () => {
  it('adds the taka sign and thousands separators', () => {
    expect(formatPrice(12500)).toBe('৳12,500')
  })
})

describe('slugify', () => {
  it('lowercases, drops symbols and joins words with dashes', () => {
    expect(slugify('  Red Silk  Saree (New)! ')).toBe('red-silk-saree-new')
  })

  it('never leaves hyphens at either end (the API rejects them)', () => {
    expect(slugify('Saree -')).toBe('saree')
    expect(slugify('- New -- Arrival -')).toBe('new-arrival')
  })
})
