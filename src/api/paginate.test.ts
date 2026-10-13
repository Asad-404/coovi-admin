import { afterEach, describe, expect, it, vi } from 'vitest'
import apiClient from './client'
import { fetchAllPages, fetchAllPagesWithTime } from './paginate'

afterEach(() => vi.restoreAllMocks())

describe('fetchAllPages', () => {
  it('keeps requesting pages until the last one', async () => {
    const get = vi.spyOn(apiClient, 'get').mockImplementation(async (_url, config) => {
      const page = (config!.params as { page: number }).page
      return { data: { data: [page * 10, page * 10 + 1], pagination: { pages: 3 } } }
    })
    expect(await fetchAllPages<number>('/orders', 2)).toEqual([10, 11, 20, 21, 30, 31])
    expect(get).toHaveBeenCalledTimes(3)
    expect(get).toHaveBeenLastCalledWith('/orders', { params: { page: 3, limit: 2 } })
  })

  it('stops on an empty page even if pagination is missing', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: [] } })
    expect(await fetchAllPages('/products', 50)).toEqual([])
  })
})

describe('fetchAllPagesWithTime', () => {
  it('returns the server time from the first page', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (_url, config) => {
      const page = (config!.params as { page: number }).page
      return { data: { data: [page], serverTime: `t${page}`, pagination: { pages: 2 } } }
    })
    expect(await fetchAllPagesWithTime<number>('/orders', 1, { updatedSince: 'x' })).toEqual({
      items: [1, 2],
      serverTime: 't1',
    })
  })
})
