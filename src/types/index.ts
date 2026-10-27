import type { Permission, Role } from '@/utils/permissions'

// Types matching the REAL coovi-api responses (see API_ENDPOINTS.md)

export type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Returned'

// Only Dhaka city is inside Dhaka; Dhaka suburbs and every other district are outside
export type DeliveryArea = 'inside_dhaka' | 'outside_dhaka'

// GET /orders/delivery-fee: the fee per area and the districts checkout offers
export interface DeliveryOptions {
  deliveryFee: number
  zones: Record<DeliveryArea, number>
  districts: string[]
}

// Where an order came from: the storefront checkout, or entered by an admin
export type OrderSource = 'website' | 'facebook' | 'whatsapp' | 'phone' | 'other'
export type ManualOrderSource = Exclude<OrderSource, 'website'>

export interface Product {
  _id: string
  slug: string
  name: string
  nameBn?: string
  description?: string
  descriptionBn?: string
  price: number
  compareAtPrice?: number | null
  images: string[]
  // Wide 1200x630 picture for social media link previews; without it the first photo is used
  shareImage?: string
  size?: string
  category: string
  stock: number
  inStock: boolean
  // Out of stock pre-orders: allowed when on, shipping in about preorderDays
  allowPreorder?: boolean
  preorderDays?: number
  // Only sent by the admin with money access; never returned by the product list
  costPrice?: number | null
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  productId: string
  name: string
  price: number
  quantity: number
  image: string
  size?: string
  // Sourced for this customer: took no stock, ships in about preorderDays
  preorder?: boolean
  preorderDays?: number
}

// The parcel booked with Steadfast. status is the courier's own delivery
// status (in_review, pending, hold, delivered, cancelled, ...)
export interface OrderCourier {
  name?: 'Steadfast'
  consignmentId?: number
  trackingCode?: string
  status?: string
  bookedAt?: string
  statusCheckedAt?: string
}

// Admin-only order records (the API never sends these to customers).
// "by" is the admin's email, or 'customer' for the order being placed.
export interface OrderNote {
  _id: string
  text: string
  by: string
  at: string
}

export interface StatusChange {
  _id: string
  from?: OrderStatus
  to: OrderStatus
  by: string
  at: string
}

export interface DetailEdit {
  _id: string
  changes: { field: string; from?: string; to?: string }[]
  by: string
  at: string
}

// Who called the customer and confirmed the order, and when
export interface CallConfirmed {
  by: string
  byId?: string
  at: string
}

// NOTE: address is a plain string in the real API (not an object)
export interface Order {
  _id: string
  orderNumber: string
  customerName: string
  phone: string
  address: string
  // Missing on orders placed before delivery areas existed (those paid the inside-Dhaka fee)
  district?: string
  deliveryArea?: DeliveryArea
  items: OrderItem[]
  subtotal: number
  // Taka off the items, agreed on a manual order (0 or missing for website orders)
  discount?: number
  deliveryFee: number
  total: number
  paymentMethod: string
  status: OrderStatus
  notes?: string
  courier?: OrderCourier
  // Why it was cancelled or the parcel came back
  cancelReason?: string
  returnedAt?: string
  // Whether the refused parcel's items went back into stock
  restocked?: boolean
  // Missing on orders from an API before manual order entry: treat as 'website'
  source?: OrderSource
  // Email of the admin who entered a manual order
  createdBy?: string
  // Set when an admin called the customer and they confirmed the order (manual orders start confirmed)
  callConfirmed?: CallConfirmed
  internalNotes?: OrderNote[]
  // Only on the admin order list: the phone is on the block list, so call before shipping
  blockedPhone?: PhoneBlock
  statusHistory?: StatusChange[]
  editHistory?: DetailEdit[]
  createdAt: string
  updatedAt: string
}

// Body of PATCH /orders/:id/status. reason is required for Returned;
// restock only applies to Returned
export interface StatusUpdate {
  status: OrderStatus
  reason?: string
  restock?: boolean
}

// POST /orders/manual body: items and quantities only, the API prices them
export interface ManualOrderInput {
  customerName: string
  phone: string
  address: string
  notes?: string
  source: ManualOrderSource
  items: { productId: string; quantity: number }[]
  deliveryFeeOverride?: number
  discount?: number
}

// One page of the admin order list (GET /orders with filters)
export interface OrderPage {
  orders: Order[]
  // How many orders match the filters across every page
  total: number
}

// Fields an admin may correct on an existing order
export type OrderDetailsUpdate = Partial<
  Pick<Order, 'customerName' | 'phone' | 'address' | 'notes' | 'district' | 'deliveryArea'>
>

// Roles and permissions are in src/utils/permissions.ts. 'admin' is the role
// accounts had before roles existed; the API turns it into 'owner'.
export type AdminRole = Role

export interface Admin {
  _id: string
  email: string
  name: string
  role: AdminRole | 'admin'
  active?: boolean
  // What this person can do (every permission for owners)
  permissions?: Permission[]
  // Their ticks differ from their role's preset
  customized?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface AuthResponse {
  token: string
  admin: {
    id: string
    email: string
    name: string
    role: string
  }
}

// Cash on delivery payouts from the courier (see API_ENDPOINTS.md, /courier-payments)
export const PAYMENT_METHODS = ['Bank transfer', 'bKash', 'Nagad', 'Cash', 'Other'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export interface CourierPaymentLine {
  order: string
  orderNumber: string
  orderTotal: number
  collected: number
  charge: number
  net: number
}

export interface CourierPayment {
  _id: string
  courier: string
  paidAt: string
  method?: PaymentMethod
  reference?: string
  lines: CourierPaymentLine[]
  collectedTotal: number
  chargeTotal: number
  netTotal: number
  amountReceived: number
  difference: number
  notes?: string
  recordedBy?: string
  createdAt: string
  updatedAt: string
}

export interface CourierPaymentSummary {
  collectedTotal: number
  chargeTotal: number
  netTotal: number
  amountReceived: number
}

export interface CourierPaymentList {
  payments: CourierPayment[]
  summary: CourierPaymentSummary
  total: number
}

export type UnpaidOrder = Pick<Order, '_id' | 'orderNumber' | 'customerName' | 'phone' | 'total' | 'status' | 'createdAt' | 'updatedAt'>

export interface UnpaidOrders {
  orders: UnpaidOrder[]
  count: number
  expectedTotal: number
}

export interface NewCourierPayment {
  courier?: string
  paidAt: string
  method?: PaymentMethod
  reference?: string
  amountReceived?: number
  notes?: string
  lines: { orderNumber: string; collected: number; charge: number }[]
}

// GET /settings/admin — shop-wide settings the owner edits on the Settings page
export interface ShopSettings {
  whatsappNumber: string // 8801XXXXXXXXX
  supportPhone: string // 01XXXXXXXXX or ''
  announcementText: string
  announcementActive: boolean
  lowStockThreshold: number
  updatedAt?: string
}

// GET /stats: orders placed in the range. `money` and the `value` fields are only
// there for people with money access.
export interface DashboardStats {
  range: { from: string; to: string; days: number }
  orders: {
    total: number
    byStatus: Record<OrderStatus, number>
    bySource: Record<string, number>
    byArea: { inside_dhaka: number; outside_dhaka: number }
    withPreorder: number
    refusedRate: number | null
  }
  pipeline: { toConfirm: number; toShip: number; onTheWay: number; preordersWaiting: number }
  daily: { date: string; orders: number; value?: number }[]
  bestSellers: { productId: string; name: string; quantity: number; value?: number }[]
  topDistricts: { district: string; orders: number }[]
  money?: {
    deliveredRevenue: number
    deliveredOrders: number
    orderValue: number
    averageOrderValue: number | null
    deliveryFees: number
    cost: number
    grossProfit: number
    profitOrders: number
    unknownCostOrders: number
    courierOwes: { orders: number; total: number }
  }
}

// A phone on the block list: its orders are still accepted but shown in red
export interface PhoneBlock {
  note?: string
  by: string
  at: string
}

// GET /customers: one row per phone, added up from its orders
export interface Customer {
  phone: string
  name: string
  address: string
  district?: string
  orders: number
  delivered: number
  cancelled: number
  returned: number
  // Delivered order totals; only sent to people with money access
  spent?: number
  firstOrderAt: string
  lastOrderAt: string
  // Two or more refused or cancelled orders
  risky: boolean
  blocked: PhoneBlock | null
}

export interface CustomerPage {
  customers: Customer[]
  total: number
}

export interface CustomerDetail {
  customer: Customer
  orders: Pick<Order, '_id' | 'orderNumber' | 'customerName' | 'status' | 'total' | 'createdAt'>[]
}

export type CustomerSort = 'recent' | 'orders' | 'refused'
