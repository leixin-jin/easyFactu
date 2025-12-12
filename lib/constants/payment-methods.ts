export const PaymentMethod = {
  CASH: "cash",
  CARD: "card",
} as const

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod]

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: "现金",
  card: "刷卡",
}
