import { describe, expect, it } from 'vitest'
import { makeOrder } from '@/test/fixtures'
import { awaitingCall, needsCallWarning } from './callConfirm'

const confirmed = { by: 'admin@coovi.com', at: '2026-10-15T10:00:00.000Z' }

describe('needsCallWarning', () => {
  it('warns only when moving an unconfirmed order to Processing', () => {
    expect(needsCallWarning(makeOrder(), 'Processing')).toBe(true)
    expect(needsCallWarning(makeOrder({ callConfirmed: confirmed }), 'Processing')).toBe(false)
    expect(needsCallWarning(makeOrder(), 'Cancelled')).toBe(false)
  })
})

describe('awaitingCall', () => {
  it('marks Pending orders nobody has confirmed yet', () => {
    expect(awaitingCall(makeOrder({ status: 'Pending' }))).toBe(true)
    expect(awaitingCall(makeOrder({ status: 'Pending', callConfirmed: confirmed }))).toBe(false)
    expect(awaitingCall(makeOrder({ status: 'Processing' }))).toBe(false)
  })
})
