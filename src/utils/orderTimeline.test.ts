import { describe, expect, it } from 'vitest'
import { makeOrder } from '@/test/fixtures'
import { actorLabel, buildTimeline } from './orderTimeline'

describe('buildTimeline', () => {
  it('mixes notes, status changes and edits, newest first', () => {
    const order = makeOrder({
      statusHistory: [
        { _id: 's1', to: 'Pending', by: 'customer', at: '2026-10-01T10:00:00.000Z' },
        { _id: 's2', from: 'Pending', to: 'Processing', by: 'admin@coovi.com', at: '2026-10-01T12:00:00.000Z' },
      ],
      internalNotes: [{ _id: 'n1', text: 'Called, no answer', by: 'admin@coovi.com', at: '2026-10-01T11:00:00.000Z' }],
      editHistory: [
        {
          _id: 'e1',
          changes: [
            { field: 'phone', from: '01711111111', to: '01822222222' },
            { field: 'notes', to: 'Ring twice' },
          ],
          by: 'admin@coovi.com',
          at: '2026-10-01T13:00:00.000Z',
        },
      ],
    })

    const timeline = buildTimeline(order)
    expect(timeline.map((e) => e.id)).toEqual(['e1', 's2', 'n1', 's1'])
    expect(timeline[0]).toMatchObject({
      text: 'Edited phone, customer note',
      details: ['Phone: "01711111111" → "01822222222"', 'Customer note: (empty) → "Ring twice"'],
    })
    expect(timeline[1].text).toBe('Pending → Processing')
    expect(timeline[3]).toMatchObject({ text: 'Order placed', by: 'customer' })
  })

  it('shows delivery areas and money in words', () => {
    const order = makeOrder({
      editHistory: [
        {
          _id: 'e1',
          changes: [
            { field: 'deliveryArea', from: 'inside_dhaka', to: 'outside_dhaka' },
            { field: 'deliveryFee', from: '70', to: '130' },
          ],
          by: 'admin@coovi.com',
          at: '2026-10-01T13:00:00.000Z',
        },
      ],
    })
    expect(buildTimeline(order)[0]).toMatchObject({
      text: 'Edited delivery area, delivery fee',
      details: ['Delivery area: Inside Dhaka → Outside Dhaka', 'Delivery fee: ৳70 → ৳130'],
    })
  })

  it('shows when an older order without history was placed', () => {
    const timeline = buildTimeline(makeOrder())
    expect(timeline).toEqual([
      { kind: 'status', id: 'placed', at: '2026-10-01T10:00:00.000Z', by: 'customer', text: 'Order placed' },
    ])
  })
})

describe('actorLabel', () => {
  it('names the customer, or shows the admin email', () => {
    expect(actorLabel('customer')).toBe('Customer')
    expect(actorLabel('admin@coovi.com')).toBe('admin@coovi.com')
  })
})
