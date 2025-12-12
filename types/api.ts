import type { OrderBatchView, OrderItemView } from "@/lib/order-utils"

// Generic API response wrapper
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: { code: string; message: string; detail?: unknown }
}

// Error response structure
export interface ApiError {
  error: string
  code?: string
  detail?: unknown
}

// Menu Items
export interface MenuItemResponse {
  id: string
  name: string
  nameEn: string
  category: string
  price: number
  description: string | null
  image: string | null
  available: boolean
}

export interface CategoryResponse {
  id: string
  name: string
  count?: number
}

export interface MenuItemListResponse {
  items: MenuItemResponse[]
  categories: CategoryResponse[]
}

export interface CreateMenuItemInput {
  name: string
  nameEn?: string
  category: string
  price: number
  description?: string
  image?: string
}

// Restaurant Tables
export interface TableResponse {
  id: string
  number: string
  area: string | null
  capacity: number | null
  status: "idle" | "occupied"
  amount: number | null
}

export type TableListResponse = TableResponse[]

export interface CreateTableInput {
  number: string
  area?: string
  capacity: number
}

// Orders
export interface OrderSummary {
  id: string
  tableId: string | null
  status: string
  subtotal: number
  discount: number
  total: number
  totalAmount?: number
  paidAmount?: number
  paymentMethod: string | null
  createdAt: string
  closedAt: string | null
}

export interface OrderResponse {
  order: OrderSummary | null
  batches: OrderBatchView[]
}

export interface CreateOrderInput {
  tableId: string
  items: {
    menuItemId: string
    quantity: number
    notes?: string | null
  }[]
  paymentMethod?: string
}

export interface ClearOrderInput {
  tableId: string
}

export interface CheckoutInput {
  orderId: string
  paymentMethod: string
  receivedAmount: number
  discountPercent?: number
  selectedItems?: {
    id: string
    quantity: number
  }[]
}

export interface CheckoutResponse {
  order: OrderSummary | null
  batches: OrderBatchView[]
  checkoutSummary: {
    subtotal: number
    discount: number
    total: number
    received: number
    change: number
  }
}

export interface TransferOrderInput {
  sourceTableId: string
  targetTableId: string
}

export interface UpdateOrderItemInput {
  type: "decrement" | "remove"
}

// Re-export types
export type { OrderBatchView, OrderItemView }
