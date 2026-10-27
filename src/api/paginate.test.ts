import { afterEach, describe, expect, it, vi } from 'vitest'
import apiClient from './client'
import { fetchAllPages } from './paginate'

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

  it('sends the filters with every page', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: [1], pagination: { pages: 1 } } })
    await fetchAllPages('/orders', 100, { status: 'Pending' })
    expect(get).toHaveBeenCalledWith('/orders', { params: { status: 'Pending', page: 1, limit: 100 } })
  })
})
