import type { Order } from '@/types'

export type TimelineEntry =
  | { kind: 'note'; id: string; at: string; by: string; text: string }
  | { kind: 'status'; id: string; at: string; by: string; text: string }
  | { kind: 'edit'; id: string; at: string; by: string; text: string; details: string[] }

const FIELD_LABELS: Record<string, string> = {
  customerName: 'Name',
  phone: 'Phone',
  address: 'Address',
  notes: 'Customer note',
}

const shown = (value?: string) => (value ? `"${value}"` : '(empty)')

// Notes, status changes and detail edits in one list, newest first
export const buildTimeline = (order: Order): TimelineEntry[] => {
  const entries: TimelineEntry[] = [
    ...(order.internalNotes ?? []).map((n) => ({ kind: 'note' as const, id: n._id, at: n.at, by: n.by, text: n.text })),
    ...(order.statusHistory ?? []).map((h) => ({
      kind: 'status' as const,
      id: h._id,
      at: h.at,
      by: h.by,
      text: h.from ? `${h.from} → ${h.to}` : 'Order placed',
    })),
    ...(order.editHistory ?? []).map((e) => ({
      kind: 'edit' as const,
      id: e._id,
      at: e.at,
      by: e.by,
      text: `Edited ${e.changes.map((c) => FIELD_LABELS[c.field] ?? c.field).join(', ').toLowerCase()}`,
      details: e.changes.map((c) => `${FIELD_LABELS[c.field] ?? c.field}: ${shown(c.from)} → ${shown(c.to)}`),
    })),
  ]

  // Orders placed before history was recorded still show when they arrived
  if (!order.statusHistory?.length) {
    entries.push({ kind: 'status', id: 'placed', at: order.createdAt, by: 'customer', text: 'Order placed' })
  }

  return entries.sort((a, b) => b.at.localeCompare(a.at))
}

// Who did it, in words: the customer, or the admin's email
export const actorLabel = (by: string): string => (by === 'customer' ? 'Customer' : by)
