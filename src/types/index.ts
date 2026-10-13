// Types matching the REAL coovi-api responses (see API_ENDPOINTS.md)

export type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled'

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

// NOTE: address is a plain string in the real API (not an object)
export interface Order {
  _id: string
  orderNumber: string
  customerName: string
  phone: string
  address: string
  items: OrderItem[]
  subtotal: number
  deliveryFee: number
  total: number
  paymentMethod: string
  status: OrderStatus
  notes?: string
  courier?: OrderCourier
  createdAt: string
  updatedAt: string
}

// Fields an admin may correct on an existing order
export type OrderDetailsUpdate = Partial<Pick<Order, 'customerName' | 'phone' | 'address' | 'notes'>>

export interface Admin {
  _id: string
  email: string
  name: string
  role: string
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
