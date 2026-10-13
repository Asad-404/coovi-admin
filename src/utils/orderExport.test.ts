import { describe, expect, it } from 'vitest'
import { ordersToCsv } from './orderExport'
import { makeOrder } from '@/test/fixtures'

describe('ordersToCsv', () => {
  it('starts with a BOM and a header row', () => {
    const csv = ordersToCsv([])
    expect(csv.startsWith('﻿"Order #"')).toBe(true)
  })

  it('has district and delivery area columns', () => {
    const csv = ordersToCsv([makeOrder({ district: 'Bogura', deliveryArea: 'outside_dhaka' }), makeOrder()])
    const [header, bogura, old] = csv.split('\r\n')
    expect(header).toContain('"Address","District","Delivery area"')
    expect(bogura).toContain('"Bogura","Outside Dhaka"')
    expect(old).toContain('"","Inside Dhaka"')
  })

  it('escapes quotes and neutralises spreadsheet formulas', () => {
    const csv = ordersToCsv([makeOrder({ customerName: '=HYPERLINK("x")', notes: 'say "hi"' })])
    const row = csv.split('\r\n')[1]
    expect(row).toContain(`"'=HYPERLINK(""x"")"`)
    expect(row).toContain('"say ""hi"""')
  })

  it('adds the cancel or return reason', () => {
    const csv = ordersToCsv([makeOrder({ status: 'Returned', cancelReason: 'Customer refused the parcel' })])
    const row = csv.split('\r\n')[1]
    expect(row).toContain('"Customer refused the parcel"')
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
