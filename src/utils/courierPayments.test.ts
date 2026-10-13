import { describe, expect, it } from 'vitest'
import { makeOrder } from '@/test/fixtures'
import {
  draftError,
  draftToPayment,
  draftTotals,
  emptyDraft,
  parseAmount,
  todayInput,
  type PaymentDraft,
} from './courierPayments'

const delivered = [
  makeOrder({ _id: 'a', orderNumber: 'ORD-1', total: 2060, status: 'Delivered' }),
  makeOrder({ _id: 'b', orderNumber: 'ORD-2', total: 1060, status: 'Delivered' }),
]

const draft = (overrides: Partial<PaymentDraft> = {}): PaymentDraft => ({
  ...emptyDraft(delivered, new Date('2026-10-13T08:00:00')),
  ...overrides,
})

describe('parseAmount', () => {
  it.each([
    ['100', 100],
    [' 80.5 ', 80.5],
    ['0', 0],
    ['12.25', 12.25],
    ['', null],
    ['-5', null],
    ['1.234', null],
    ['abc', null],
    ['12.', null],
  ])('%j -> %j', (text, expected) => {
    expect(parseAmount(text)).toBe(expected)
  })
})

describe('emptyDraft', () => {
  it('starts from today and expects each order total in full', () => {
    const d = draft()
    expect(d.paidAt).toBe('2026-10-13')
    expect(d.lines).toEqual([
      { orderNumber: 'ORD-1', orderTotal: 2060, collected: '2060', charge: '' },
      { orderNumber: 'ORD-2', orderTotal: 1060, collected: '1060', charge: '' },
    ])
  })

  it('formats today as yyyy-mm-dd', () => {
    expect(todayInput(new Date('2026-01-05T12:00:00'))).toBe('2026-01-05')
  })
})

describe('draftTotals', () => {
  it('previews collected, charges and net, ignoring unfinished numbers', () => {
    const d = draft()
    d.lines[0].charge = '70'
    d.lines[1].charge = '80.5'
    expect(draftTotals(d.lines)).toEqual({ collected: 3120, charge: 150.5, net: 2969.5 })
    d.lines[1].charge = '8x'
    expect(draftTotals(d.lines).charge).toBe(70)
  })
})

describe('draftError', () => {
  it('accepts a complete draft, with blank charges meaning zero', () => {
    expect(draftError(draft())).toBeNull()
  })

  it.each([
    [{ paidAt: '' }, 'date'],
    [{ lines: [] }, 'at least one order'],
    [{ amountReceived: 'lots' }, 'amount received'],
  ])('%j -> mentions %s', (overrides, message) => {
    expect(draftError(draft(overrides))).toContain(message)
  })

  it('catches bad rows', () => {
    const blank = draft()
    blank.lines[1].orderNumber = ' '
    expect(draftError(blank)).toContain('order number')

    const twice = draft()
    twice.lines[1].orderNumber = 'ORD-1'
    expect(draftError(twice)).toContain('ORD-1 is listed twice')

    const noCash = draft()
    noCash.lines[0].collected = ''
    expect(draftError(noCash)).toContain('cash collected for ORD-1')

    const badCharge = draft()
    badCharge.lines[1].charge = '-3'
    expect(draftError(badCharge)).toContain('charge for ORD-2')
  })
})

describe('draftToPayment', () => {
  it('sends numbers and leaves out empty optional fields', () => {
    const d = draft()
    d.lines[0].charge = '70'
    expect(draftToPayment(d)).toEqual({
      paidAt: '2026-10-13',
      lines: [
        { orderNumber: 'ORD-1', collected: 2060, charge: 70 },
        { orderNumber: 'ORD-2', collected: 1060, charge: 0 },
      ],
    })
  })

  it('includes the optional fields when filled', () => {
    const d = draft({ method: 'bKash', reference: ' SF-1 ', notes: ' short by 10 ', amountReceived: '3000' })
    expect(draftToPayment(d)).toMatchObject({ method: 'bKash', reference: 'SF-1', notes: 'short by 10', amountReceived: 3000 })
  })
})
