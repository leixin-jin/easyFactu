export const OrderStatus = {
  OPEN: "open",
  PAID: "paid",
  CANCELLED: "cancelled",
} as const

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus]

export const orderStatusLabels: Record<OrderStatus, string> = {
  open: "进行中",
  paid: "已结账",
  cancelled: "已取消",
}
