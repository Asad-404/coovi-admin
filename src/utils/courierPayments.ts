import type { NewCourierPayment, PaymentMethod, UnpaidOrder } from '@/types'

// One editable row in the "Record payment" dialog. Amounts are kept as the text
// the admin typed so a half-typed "12." doesn't jump around.
export interface PaymentLineDraft {
  orderNumber: string
  // the order's total, for a hint when the courier collected a different amount
  orderTotal?: number
  collected: string
  charge: string
}

export interface PaymentDraft {
  paidAt: string
  method: PaymentMethod | ''
  reference: string
  amountReceived: string
  notes: string
  lines: PaymentLineDraft[]
}

const round2 = (value: number): number => Math.round(value * 100) / 100

// A money field: blank or a non-negative number with at most two decimals
export const parseAmount = (text: string): number | null => {
  const trimmed = text.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null
  return Number(trimmed)
}

// Today in the admin's own time zone, as the yyyy-mm-dd a date input wants
export const todayInput = (now: Date = new Date()): string => {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

// Selected delivered orders become lines that expect the full order total
export const linesFromOrders = (orders: UnpaidOrder[]): PaymentLineDraft[] =>
  orders.map((order) => ({
    orderNumber: order.orderNumber,
    orderTotal: order.total,
    collected: String(order.total),
    charge: '',
  }))

export const emptyDraft = (orders: UnpaidOrder[], now?: Date): PaymentDraft => ({
  paidAt: todayInput(now),
  method: '',
  reference: '',
  amountReceived: '',
  notes: '',
  lines: linesFromOrders(orders),
})

// Live preview of what the API will compute; the API's numbers are the ones saved
export const draftTotals = (lines: PaymentLineDraft[]) => {
  const collected = round2(lines.reduce((sum, l) => sum + (parseAmount(l.collected) ?? 0), 0))
  const charge = round2(lines.reduce((sum, l) => sum + (parseAmount(l.charge) ?? 0), 0))
  return { collected, charge, net: round2(collected - charge) }
}

// Returns the first problem with the draft, or null when it can be sent
export const draftError = (draft: PaymentDraft): string | null => {
  if (!draft.paidAt) return 'Enter the date the money arrived'
  if (draft.lines.length === 0) return 'Add at least one order'
  const numbers = draft.lines.map((l) => l.orderNumber.trim())
  if (numbers.some((n) => !n)) return 'Every row needs an order number'
  const repeated = numbers.find((n, i) => numbers.indexOf(n) !== i)
  if (repeated) return `${repeated} is listed twice`
  for (const line of draft.lines) {
    if (parseAmount(line.collected) === null) return `Enter the cash collected for ${line.orderNumber}`
    // a blank charge means the courier kept nothing for this parcel
    if (line.charge.trim() && parseAmount(line.charge) === null) return `Check the charge for ${line.orderNumber}`
  }
  if (draft.amountReceived.trim() && parseAmount(draft.amountReceived) === null) return 'Check the amount received'
  return null
}

// Only call after draftError returned null
export const draftToPayment = (draft: PaymentDraft): NewCourierPayment => ({
  paidAt: draft.paidAt,
  ...(draft.method && { method: draft.method }),
  ...(draft.reference.trim() && { reference: draft.reference.trim() }),
  ...(draft.notes.trim() && { notes: draft.notes.trim() }),
  ...(draft.amountReceived.trim() && { amountReceived: parseAmount(draft.amountReceived)! }),
  lines: draft.lines.map((l) => ({
    orderNumber: l.orderNumber.trim(),
    collected: parseAmount(l.collected)!,
    charge: parseAmount(l.charge) ?? 0,
  })),
})
