import type { Order, OrderStatus } from '@/types'

// The website can't check that a phone belongs to the person ordering, so every
// order should be confirmed by a call before it is packed. Moving an unconfirmed
// order to Processing asks first.
export const needsCallWarning = (order: Pick<Order, 'callConfirmed'>, next: OrderStatus): boolean =>
  next === 'Processing' && !order.callConfirmed

// A Pending order nobody has called yet: shown with a "Not called" mark in the list
export const awaitingCall = (order: Pick<Order, 'status' | 'callConfirmed'>): boolean =>
  order.status === 'Pending' && !order.callConfirmed
