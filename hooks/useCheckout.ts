"use client"

import { useMemo, useReducer } from "react"

import type { OrderBatchView } from "@/lib/order-utils"

export interface AAItemSelection {
  id: string
  name: string
  price: number
  quantity: number
}

interface CheckoutState {
  dialogOpen: boolean
  discountPercent: number
  paymentMethod: string
  receivedAmount: number
  aaMode: boolean
  aaItems: AAItemSelection[]
  aaQuantityDialogOpen: boolean
  aaQuantityTarget:
    | {
        itemId: string
        name: string
        maxQuantity: number
        price: number
      }
    | null
  aaQuantityInput: number
}

type CheckoutAction =
  | { type: "OPEN_FULL" }
  | { type: "OPEN_AA" }
  | { type: "CLOSE" }
  | { type: "SET_DISCOUNT"; value: number }
  | { type: "SET_PAYMENT_METHOD"; value: string }
  | { type: "SET_RECEIVED"; value: number }
  | { type: "TOGGLE_AA_ITEM"; item: { id: string; name: string; price: number; quantity: number } }
  | {
      type: "OPEN_AA_QUANTITY"
      target: { itemId: string; name: string; maxQuantity: number; price: number }
      currentQuantity: number
    }
  | { type: "CLOSE_AA_QUANTITY" }
  | { type: "CONFIRM_AA_QUANTITY"; quantity: number }
  | { type: "RESET" }

const initialCheckoutState: CheckoutState = {
  dialogOpen: false,
  discountPercent: 0,
  paymentMethod: "cash",
  receivedAmount: 0,
  aaMode: false,
  aaItems: [],
  aaQuantityDialogOpen: false,
  aaQuantityTarget: null,
  aaQuantityInput: 1,
}

function checkoutReducer(state: CheckoutState, action: CheckoutAction): CheckoutState {
  switch (action.type) {
    case "OPEN_FULL":
      return {
        ...state,
        dialogOpen: true,
        aaMode: false,
        aaItems: [],
        receivedAmount: 0,
        aaQuantityDialogOpen: false,
        aaQuantityTarget: null,
        aaQuantityInput: 1,
      }
    case "OPEN_AA":
      return {
        ...state,
        dialogOpen: true,
        aaMode: true,
        aaItems: [],
        receivedAmount: 0,
        aaQuantityDialogOpen: false,
        aaQuantityTarget: null,
        aaQuantityInput: 1,
      }
    case "CLOSE":
      return {
        ...state,
        dialogOpen: false,
        receivedAmount: 0,
        aaMode: false,
        aaItems: [],
        aaQuantityDialogOpen: false,
        aaQuantityTarget: null,
        aaQuantityInput: 1,
      }
    case "SET_DISCOUNT":
      return { ...state, discountPercent: action.value }
    case "SET_PAYMENT_METHOD":
      return { ...state, paymentMethod: action.value }
    case "SET_RECEIVED":
      return { ...state, receivedAmount: action.value }
    case "TOGGLE_AA_ITEM": {
      if (!state.aaMode) return state
      const existing = state.aaItems.find((aa) => aa.id === action.item.id)
      if (existing && action.item.quantity <= 1) {
        return { ...state, aaItems: state.aaItems.filter((aa) => aa.id !== action.item.id) }
      }
      if (!existing && action.item.quantity <= 1) {
        return { ...state, aaItems: [...state.aaItems, { ...action.item, quantity: 1 }] }
      }
      return state
    }
    case "OPEN_AA_QUANTITY":
      return {
        ...state,
        aaQuantityDialogOpen: true,
        aaQuantityTarget: action.target,
        aaQuantityInput: action.currentQuantity || 1,
      }
    case "CLOSE_AA_QUANTITY":
      return {
        ...state,
        aaQuantityDialogOpen: false,
        aaQuantityTarget: null,
        aaQuantityInput: 1,
      }
    case "CONFIRM_AA_QUANTITY": {
      if (!state.aaMode || !state.aaQuantityTarget) return state
      const { itemId, name, price } = state.aaQuantityTarget
      const quantity = Math.min(Math.max(action.quantity, 1), state.aaQuantityTarget.maxQuantity)
      const remaining = state.aaItems.filter((aa) => aa.id !== itemId)
      return {
        ...state,
        aaItems: [...remaining, { id: itemId, name, price, quantity }],
        aaQuantityDialogOpen: false,
        aaQuantityTarget: null,
        aaQuantityInput: 1,
      }
    }
    case "RESET":
      return { ...initialCheckoutState }
    default:
      return state
  }
}

interface UseCheckoutArgs {
  batches: OrderBatchView[]
  cart: { id: string; name: string; price: number; quantity: number }[]
}

export function useCheckout(args: UseCheckoutArgs) {
  const [state, dispatch] = useReducer(checkoutReducer, initialCheckoutState)
  const { batches, cart } = args

  const aggregatedItems = useMemo(() => {
    const map = new Map<string, { id: string; name: string; quantity: number; price: number }>()

    const addItem = (id: string, name: string, quantity: number, price: number) => {
      if (!id) return
      const existing = map.get(id)
      if (existing) {
        existing.quantity += quantity
      } else {
        map.set(id, { id, name, quantity, price })
      }
    }

    batches.forEach((batch) => {
      batch.items.forEach((item) => {
        addItem(item.menuItemId, item.name, item.quantity, item.price)
      })
    })

    cart.forEach((item) => {
      addItem(item.id, item.name, item.quantity, item.price)
    })

    return Array.from(map.values())
  }, [batches, cart])

  const existingSubtotal = useMemo(
    () =>
      batches.reduce(
        (batchSum, batch) =>
          batchSum + batch.items.reduce((itemSum, item) => itemSum + item.price * item.quantity, 0),
        0,
      ),
    [batches],
  )

  const draftSubtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  )

  const subtotal = existingSubtotal + draftSubtotal
  const discountAmount = (subtotal * state.discountPercent) / 100
  const total = subtotal - discountAmount

  const aaSubtotal = useMemo(
    () => state.aaItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [state.aaItems],
  )

  const checkoutSubtotal = state.aaMode ? aaSubtotal : subtotal
  const checkoutDiscountAmount = (checkoutSubtotal * state.discountPercent) / 100
  const checkoutTotal = checkoutSubtotal - checkoutDiscountAmount
  const changeAmount =
    state.receivedAmount > 0 ? state.receivedAmount - checkoutTotal : 0

  const totalItemsCount =
    batches.reduce(
      (batchSum, batch) =>
        batchSum + batch.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0,
    ) + cart.reduce((sum, item) => sum + item.quantity, 0)

  const maxExistingBatchNo =
    batches.length > 0 ? Math.max(...batches.map((b) => b.batchNo)) : 0

  return {
    state,
    dispatch,
    aggregatedItems,
    subtotal,
    discountAmount,
    total,
    aaSubtotal,
    checkoutSubtotal,
    checkoutDiscountAmount,
    checkoutTotal,
    changeAmount,
    totalItemsCount,
    maxExistingBatchNo,
  }
}

