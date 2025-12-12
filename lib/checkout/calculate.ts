export interface CheckoutItem {
  price: number
  quantity: number
}

export interface CheckoutResult {
  subtotal: number
  discount: number
  total: number
}

export function calculateCheckoutTotal(
  items: CheckoutItem[],
  discountPercent: number,
): CheckoutResult {
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  )
  const discount = (subtotal * Math.max(0, Math.min(100, discountPercent))) / 100
  const total = Math.max(0, subtotal - discount)

  return { subtotal, discount, total }
}

export interface AAAllocationItem {
  id: string
  name: string
  price: number
  quantity: number
}

export interface AASplitResult {
  totalPeople: number
  perPersonAmount: number
  items: AAAllocationItem[]
}

export function calculateAASplit(
  items: AAAllocationItem[],
  totalPeople: number,
  discountPercent: number = 0,
): AASplitResult {
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  )
  const discount = (subtotal * Math.max(0, Math.min(100, discountPercent))) / 100
  const total = Math.max(0, subtotal - discount)
  const perPersonAmount = totalPeople > 0 ? total / totalPeople : 0

  return {
    totalPeople,
    perPersonAmount: Math.round(perPersonAmount * 100) / 100,
    items,
  }
}
