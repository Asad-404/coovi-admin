import apiClient from './client.ts'

// Safety stop so a misbehaving API can never loop forever
const MAX_PAGES = 200

// Walks every page of a paginated list endpoint ({ data, pagination: { pages } })
// so stats, search and CSV export see all records, not just the first page.
export async function fetchAllPages<T>(
  path: string,
  pageSize: number,
  params: Record<string, string | number> = {},
): Promise<T[]> {
  return (await fetchAllPagesWithTime<T>(path, pageSize, params)).items
}

// Same walk, also returning the server's clock from the first page (`serverTime`), which
// the caller passes back as `updatedSince` to ask only for what changed afterwards
export async function fetchAllPagesWithTime<T>(
  path: string,
  pageSize: number,
  params: Record<string, string | number> = {},
): Promise<{ items: T[]; serverTime?: string }> {
  const items: T[] = []
  let serverTime: string | undefined
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await apiClient.get(path, { params: { ...params, page, limit: pageSize } })
    serverTime ??= res.data.serverTime
    const batch: T[] = res.data.data ?? []
    items.push(...batch)
    const pages: number = res.data.pagination?.pages ?? 1
    if (batch.length === 0 || page >= pages) break
  }
  return { items, serverTime }
}
