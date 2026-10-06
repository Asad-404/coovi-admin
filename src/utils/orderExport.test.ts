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
})
