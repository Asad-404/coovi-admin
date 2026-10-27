import type { Customer } from '@/types'

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`

// "3 orders: 1 delivered, 1 refused, 1 cancelled", leaving out the parts that are 0
export const customerSummary = (c: Pick<Customer, 'orders' | 'delivered' | 'returned' | 'cancelled'>): string => {
  const parts = [
    c.delivered && `${c.delivered} delivered`,
    c.returned && `${c.returned} refused`,
    c.cancelled && `${c.cancelled} cancelled`,
  ].filter(Boolean)
  return parts.length ? `${plural(c.orders, 'order')}: ${parts.join(', ')}` : plural(c.orders, 'order')
}

// "Blocked: Refused twice" or just "Blocked"
export const blockLabel = (note?: string): string => (note ? `Blocked: ${note}` : 'Blocked')
