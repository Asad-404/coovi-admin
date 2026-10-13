import { describe, expect, it } from 'vitest'
import {
  announcementError,
  normalizeSupportPhone,
  normalizeWhatsapp,
  parseLowStockThreshold,
} from './settingsForm'

describe('normalizeWhatsapp', () => {
  it('accepts local, international and formatted numbers', () => {
    expect(normalizeWhatsapp('01712345678')).toBe('8801712345678')
    expect(normalizeWhatsapp('8801712345678')).toBe('8801712345678')
    expect(normalizeWhatsapp('+880 1712-345678')).toBe('8801712345678')
  })

  it('rejects numbers that are not Bangladeshi mobiles', () => {
    expect(normalizeWhatsapp('')).toBeNull()
    expect(normalizeWhatsapp('0171234567')).toBeNull()
    expect(normalizeWhatsapp('01212345678')).toBeNull()
    expect(normalizeWhatsapp('447700900123')).toBeNull()
  })
})

describe('normalizeSupportPhone', () => {
  it('returns the local format, or empty for an empty box', () => {
    expect(normalizeSupportPhone('01812-345678')).toBe('01812345678')
    expect(normalizeSupportPhone('+8801812345678')).toBe('01812345678')
    expect(normalizeSupportPhone('  ')).toBe('')
  })

  it('rejects invalid numbers', () => {
    expect(normalizeSupportPhone('12345')).toBeNull()
  })
})

describe('announcementError', () => {
  it('needs text when switched on, but not when off', () => {
    expect(announcementError('  ', true)).not.toBe('')
    expect(announcementError('', false)).toBe('')
    expect(announcementError('Eid sale', true)).toBe('')
  })

  it('limits the length', () => {
    expect(announcementError('x'.repeat(121), false)).not.toBe('')
  })
})

describe('parseLowStockThreshold', () => {
  it('accepts whole numbers from 0 to 1000', () => {
    expect(parseLowStockThreshold('0')).toBe(0)
    expect(parseLowStockThreshold('6')).toBe(6)
    expect(parseLowStockThreshold('1000')).toBe(1000)
  })

  it('rejects anything else', () => {
    expect(parseLowStockThreshold('')).toBeNull()
    expect(parseLowStockThreshold('-1')).toBeNull()
    expect(parseLowStockThreshold('2.5')).toBeNull()
    expect(parseLowStockThreshold('1001')).toBeNull()
  })
})
