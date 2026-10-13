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
