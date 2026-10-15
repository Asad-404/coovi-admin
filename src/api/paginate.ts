import apiClient from './client.ts'

// Safety stop so a misbehaving API can never loop forever
const MAX_PAGES = 200

// Walks every page of a paginated list endpoint ({ data, pagination: { pages } })
// for the few places that need every record: the product list and the orders CSV export.
export async function fetchAllPages<T>(
  path: string,
  pageSize: number,
  params: Record<string, string | number> = {},
): Promise<T[]> {
  const items: T[] = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await apiClient.get(path, { params: { ...params, page, limit: pageSize } })
    const batch: T[] = res.data.data ?? []
    items.push(...batch)
    const pages: number = res.data.pagination?.pages ?? 1
    if (batch.length === 0 || page >= pages) break
  }
  return items
}
