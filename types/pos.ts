import type { OrderBatchView, OrderItemView } from "@/lib/order-utils"

export interface MenuItem {
  id: string
  name: string
  nameEn: string
  category: string
  price: number
  image: string
  available: boolean
  popular?: boolean
  spicy?: number
}

export interface CartItem extends MenuItem {
  quantity: number
  notes?: string
}

export type { OrderBatchView, OrderItemView }

export interface CurrentOrderSummary {
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

export interface AAItemSelection {
  id: string
  name: string
  price: number
  quantity: number
}

export interface ReceiptItem {
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface CheckoutReceiptData {
  mode: "full" | "aa"
  orderId: string
  tableNumber: string
  paidAt: string
  paymentMethod: string
  subtotal: number
  discountPercent: number
  discountAmount: number
  total: number
  receivedAmount: number
  changeAmount: number
  items: ReceiptItem[]
}
