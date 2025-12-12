export type ErrorCode =
  | "SUBTOTAL_MISMATCH"
  | "TOTAL_MISMATCH"
  | "AA_QUANTITY_EXCEEDS_ORDER"
  | "AA_QUANTITY_CONFLICT"
  | "AA_ITEMS_REQUIRED"
  | "INSUFFICIENT_RECEIVED_AMOUNT"
  | "ITEM_FULLY_PAID"
  | "DECREMENT_BELOW_PAID_QUANTITY"
  | "REMOVE_PAID_ITEM_FORBIDDEN"
  | "ORDER_NOT_OPEN"
  | "ORDER_EMPTY"
  | "TABLE_NOT_FOUND"
  | "ORDER_NOT_FOUND"
  | "OPEN_ORDER_ALREADY_EXISTS"

export const errorCodeToMessage: Record<ErrorCode, string> = {
  SUBTOTAL_MISMATCH: "订单金额已在其他终端更新，请刷新后按最新金额重新结账。",
  TOTAL_MISMATCH: "订单金额已在其他终端更新，请刷新后按最新金额重新结账。",
  AA_QUANTITY_EXCEEDS_ORDER: "AA 份数超过订单中可分配的数量，请检查选择。",
  AA_QUANTITY_CONFLICT: "AA 结账时菜品数量发生冲突，请刷新后重试。",
  AA_ITEMS_REQUIRED: "AA 结账至少需要选择一项菜品。",
  INSUFFICIENT_RECEIVED_AMOUNT: "收款金额不足，请确认实收金额大于等于应付金额。",
  ITEM_FULLY_PAID: "该菜品已全部结清，无法再次修改或 AA。",
  DECREMENT_BELOW_PAID_QUANTITY: "不能将数量减到已支付份数以下。",
  REMOVE_PAID_ITEM_FORBIDDEN: "已支付或部分支付的菜品不能被移除。",
  ORDER_NOT_OPEN: "订单已不在进行中状态，无法结账。",
  ORDER_EMPTY: "当前订单没有任何菜品，无法结账。",
  TABLE_NOT_FOUND: "未找到对应桌台，请刷新页面后重试。",
  ORDER_NOT_FOUND: "未找到对应订单，请刷新页面后重试。",
  OPEN_ORDER_ALREADY_EXISTS: "该桌台已存在进行中的订单，请刷新后重试。",
}

export function getErrorMessage(code: string, fallback?: string): string {
  if (code in errorCodeToMessage) {
    return errorCodeToMessage[code as ErrorCode]
  }
  return fallback ?? `操作失败（错误码：${code}）`
}
