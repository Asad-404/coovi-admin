import { describe, expect, it } from 'vitest'
import { toOrderQuery } from './orderFilters'
import type { OrderFilters } from './orderFilters'

const none: OrderFilters = { search: '', status: 'All', area: 'All', from: '', to: '', source: 'All' }

describe('toOrderQuery', () => {
  it('sends nothing with no filters', () => {
    expect(toOrderQuery(none)).toEqual({})
    expect(toOrderQuery({ search: '  ', status: 'All', from: '', to: '' })).toEqual({})
  })

  it('sends each filter that is set, with the search trimmed', () => {
    expect(
      toOrderQuery({
        search: ' 0171 ',
        status: 'Pending',
        area: 'outside_dhaka',
        source: 'facebook',
        from: '2026-10-01',
        to: '2026-10-15',
      }),
    ).toEqual({
      search: '0171',
      status: 'Pending',
      deliveryArea: 'outside_dhaka',
      source: 'facebook',
      from: '2026-10-01',
      to: '2026-10-15',
    })
  })

  it('allows an open-ended date range', () => {
    expect(toOrderQuery({ ...none, from: '2026-10-01' })).toEqual({ from: '2026-10-01' })
    expect(toOrderQuery({ ...none, to: '2026-10-15' })).toEqual({ to: '2026-10-15' })
  })
})
