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

export interface UpdateMenuItemInput {
  name?: string
  nameEn?: string
  category?: string
  price?: number
  description?: string
  image?: string
}

export interface DeletedMenuListResponse {
  items: MenuItemResponse[]
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

// Checkout History Types
export interface CheckoutHistoryItem {
  transactionId: string
  tableNumber: string | null
  amount: number
  createdAt: string
  orderId: string | null
}

export interface CheckoutHistoryResponse {
  items: CheckoutHistoryItem[]
}

// Transaction Detail Types
export interface TransactionItemDetail {
  id: string
  orderItemId: string
  quantity: number
  menuItemId: string
  nameSnapshot: string
  unitPrice: number
  createdAt: string
}

export interface TransactionDetail {
  id: string
  type: "income" | "expense"
  category: string
  amount: number
  description: string | null
  date: string
  paymentMethod: string
  orderId: string | null
  createdAt: string
  tableNumber: string | null
}

export interface TransactionDetailResponse {
  transaction: TransactionDetail
  items: TransactionItemDetail[]
  hasItems: boolean
}

export interface ReverseTransactionResponse {
  success: boolean
  orderId: string
  orderStatus: string
  tableNumber: string | null
  reversedAmount: number
  newPaidAmount: number
}

// Daily Closure Types
export type DailyClosurePaymentGroup = "cash" | "card" | "platform" | "other"
export type DailyClosureAdjustmentType = "fee" | "rounding" | "other"

export interface DailyClosureOverview {
  grossRevenue: number
  netRevenue: number
  ordersCount: number
  averageOrderValueGross: number
  averageOrderValueNet: number
  refundAmount: number
  voidAmount: number
}

export interface DailyClosurePaymentLine {
  paymentMethod: string
  paymentGroup: DailyClosurePaymentGroup
  expectedAmount: number
  adjustmentsAmount: number
  actualAmount: number
}

export interface DailyClosurePayments {
  expectedTotal: number
  actualTotal: number
  difference: number
  cashExpectedTotal: number
  cashActualTotal: number
  nonCashExpectedTotal: number
  nonCashActualTotal: number
  lines: DailyClosurePaymentLine[]
}

export interface DailyClosureItemLine {
  menuItemId: string | null
  name: string
  category: string
  quantitySold: number
  revenueAmount: number
  discountImpactAmount: number | null
}

export interface DailyClosureItems {
  categories: string[]
  lines: DailyClosureItemLine[]
}

export interface DailyClosureAdjustment {
  id: string
  type: DailyClosureAdjustmentType
  amount: number
  note: string
  paymentMethod: string | null
  createdAt: string
}

export interface DailyClosureResponse {
  periodStartAt: string
  periodEndAt: string
  sequenceNo: number | null
  taxRate: number
  locked: boolean
  closureId: string | null
  lockedAt: string | null
  overview: DailyClosureOverview
  payments: DailyClosurePayments
  items: DailyClosureItems
  adjustments: DailyClosureAdjustment[]
  meta?: {
    refundVoidPolicy?: string
  }
}

export interface ConfirmDailyClosureInput {
  taxRate?: number
  adjustments?: Array<{
    type: DailyClosureAdjustmentType
    amount: number
    note: string
    paymentMethod?: string | null
  }>
}

export interface CreateDailyClosureAdjustmentInput {
  type: DailyClosureAdjustmentType
  amount: number
  note: string
  paymentMethod?: string | null
}

export interface CreateDailyClosureAdjustmentResponse {
  adjustments: DailyClosureAdjustment[]
}

// Reports Types
export type ReportGranularity = "day" | "week" | "month" | "year"

export interface ReportsRange {
  granularity: ReportGranularity
  startAt: string
  endAt: string
}

export interface ReportsKpis {
  grossRevenue: number
  ordersCount: number
  averageOrderValueGross: number
  cashAmount: number
  bankAmount: number
  cashRatio: number
  bankRatio: number
}

export interface ReportsSalesTrendPoint {
  bucket: string
  revenue: number
}

export interface ReportsTopItem {
  menuItemId: string | null
  name: string
  category: string
  quantitySold: number
  revenueAmount: number
}

export interface ReportsResponse {
  range: ReportsRange
  kpis: ReportsKpis
  salesTrend: ReportsSalesTrendPoint[]
  topItems: ReportsTopItem[]
}
