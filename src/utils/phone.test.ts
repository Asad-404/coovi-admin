import { describe, expect, it } from 'vitest'
import { telHref, whatsappHref } from './phone'

describe('phone links', () => {
  it('builds a call link from the digits', () => {
    expect(telHref('01711111111')).toBe('tel:01711111111')
    expect(telHref('017 1111-1111')).toBe('tel:01711111111')
  })

  it('builds a WhatsApp link with the country code', () => {
    expect(whatsappHref('01711111111')).toBe('https://wa.me/8801711111111')
  })

  it('gives no WhatsApp link for a number that is not a mobile', () => {
    expect(whatsappHref('12345')).toBeNull()
  })
})
