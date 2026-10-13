// Types matching the REAL coovi-api responses (see API_ENDPOINTS.md)

export type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled'

// Only Dhaka city is inside Dhaka; Dhaka suburbs and every other district are outside
export type DeliveryArea = 'inside_dhaka' | 'outside_dhaka'

// GET /orders/delivery-fee: the fee per area and the districts checkout offers
export interface DeliveryOptions {
  deliveryFee: number
  zones: Record<DeliveryArea, number>
  districts: string[]
}

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
  deliveryFee: number
  total: number
  paymentMethod: string
  status: OrderStatus
  notes?: string
  createdAt: string
  updatedAt: string
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

// GET /settings/admin — shop-wide settings the owner edits on the Settings page
export interface ShopSettings {
  whatsappNumber: string // 8801XXXXXXXXX
  supportPhone: string // 01XXXXXXXXX or ''
  announcementText: string
  announcementActive: boolean
  lowStockThreshold: number
  updatedAt?: string
}
