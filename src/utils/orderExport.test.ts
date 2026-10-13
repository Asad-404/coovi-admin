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

  it('adds the cancel or return reason and the refund', () => {
    const csv = ordersToCsv([
      makeOrder({ status: 'Returned', cancelReason: 'Changed mind', refundAmount: 3000, refundMethod: 'bKash' }),
    ])
    const row = csv.split('\r\n')[1]
    expect(row).toContain('"Changed mind"')
    expect(row).toContain('"3000 (bKash)"')
  })
})
