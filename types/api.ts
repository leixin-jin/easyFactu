// Generic API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ApiError
}

export interface ApiError {
  code: string
  message: string
  detail?: unknown
}

// Table Types
export type TableStatus = "idle" | "occupied"

export interface TableResponse {
  id: string
  number: string
  area: string | null
  capacity: number
  status: TableStatus
  amount: number | null
}

export interface TableListResponse {
  tables: TableResponse[]
}

export interface CreateTableInput {
  number: string
  area?: string
  capacity: number
}

// Menu Item Types
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

export interface MenuListResponse {
  categories: CategoryResponse[]
  items: MenuItemResponse[]
}

export interface CreateMenuItemInput {
  name: string
  nameEn?: string
  category: string
  price: number
  description?: string
  image?: string
}

// Order Types
export type OrderStatus = "open" | "paid" | "cancelled"

export interface OrderItemView {
  id: string
  menuItemId: string
  name: string
  nameEn: string
  price: number
  quantity: number
  notes: string | null
  createdAt: string
}

export interface OrderBatchView {
  batchNo: number
  items: OrderItemView[]
}

export interface OrderSummary {
  id: string
  tableId: string | null
  status: OrderStatus
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
  items: CreateOrderItemInput[]
  paymentMethod?: string
}

export interface CreateOrderItemInput {
  menuItemId: string
  quantity: number
  notes?: string | null
}

export interface CheckoutInput {
  orderId: string
  paymentMethod: string
  paidAmount: number
  discountPercent?: number
  items?: { id: string; quantity: number }[]
}

export interface CheckoutResponse {
  order: OrderSummary
  batches: OrderBatchView[]
}

export interface ClearOrderInput {
  tableId: string
}

export interface UpdateOrderItemInput {
  type: "decrement" | "remove"
}

export interface TransferOrderInput {
  sourceTableId: string
  targetTableId: string
  items?: { id: string; quantity: number }[]
}
