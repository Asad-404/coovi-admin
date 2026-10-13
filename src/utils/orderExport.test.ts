import { describe, expect, it } from 'vitest'
import { ordersToCsv } from './orderExport'
import { makeOrder } from '@/test/fixtures'

describe('ordersToCsv', () => {
  it('starts with a BOM and a header row', () => {
    const csv = ordersToCsv([])
    expect(csv.startsWith('﻿"Order #"')).toBe(true)
  })

  it('escapes quotes and neutralises spreadsheet formulas', () => {
    const csv = ordersToCsv([makeOrder({ customerName: '=HYPERLINK("x")', notes: 'say "hi"' })])
    const row = csv.split('\r\n')[1]
    expect(row).toContain(`"'=HYPERLINK(""x"")"`)
    expect(row).toContain('"say ""hi"""')
  })

  it('adds the courier tracking code as the last column', () => {
    const csv = ordersToCsv([makeOrder({ courier: { name: 'Steadfast', trackingCode: '15BAEB8A' } })])
    const [header, row] = csv.split('\r\n')
    expect(header.endsWith('"Tracking code"')).toBe(true)
    expect(row.endsWith('"15BAEB8A"')).toBe(true)
  })

  it('includes the discount and the source', () => {
    const csv = ordersToCsv([makeOrder({ subtotal: 2000, discount: 200, total: 1860, source: 'facebook' })])
    const [header, row] = csv.split('\r\n')
    expect(header).toContain('"Discount"')
    expect(header).toContain('"Source"')
    expect(row).toContain('"200"')
    expect(row).toContain('"Facebook"')
  })

  it('shows website orders without a discount as 0 and Website', () => {
    const row = ordersToCsv([makeOrder()]).split('\r\n')[1]
    expect(row).toContain('"2000","0","60","2060"')
    expect(row).toContain('"Website"')
  })
})
