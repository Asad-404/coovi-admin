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
  size?: string
  category: string
  stock: number
  inStock: boolean
  // Out of stock pre-orders: allowed when on, shipping in about preorderDays
  allowPreorder?: boolean
  preorderDays?: number
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
  // Why it was cancelled or the parcel came back
  cancelReason?: string
  returnedAt?: string
  // Whether the refused parcel's items went back into stock
  restocked?: boolean
  // Missing on orders from an API before manual order entry: treat as 'website'
  source?: OrderSource
  // Email of the admin who entered a manual order
  createdBy?: string
  internalNotes?: OrderNote[]
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

// The admin's cached order list and the server clock it was fetched at (see utils/orderSync.ts)
export interface OrderList {
  orders: Order[]
  serverTime?: string
}

// Fields an admin may correct on an existing order
export type OrderDetailsUpdate = Partial<
  Pick<Order, 'customerName' | 'phone' | 'address' | 'notes' | 'district' | 'deliveryArea'>
>

// owner: everything. staff: orders and products only. 'admin' is the role
// accounts had before roles existed; the API turns it into 'owner'.
export type AdminRole = 'owner' | 'staff'

export interface Admin {
  _id: string
  email: string
  name: string
  role: AdminRole | 'admin'
  active?: boolean
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
