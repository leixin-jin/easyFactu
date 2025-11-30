"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { useToast } from "@/hooks/use-toast"
import type { CartItem, CurrentOrderSummary, OrderBatchView } from "@/types/pos"

interface UpdateOrderStateArgs {
  order?: CurrentOrderSummary | null
  batches?: OrderBatchView[]
}

export function usePosOrder(tableId: string) {
  const { toast } = useToast()

  const [currentOrder, setCurrentOrder] = useState<CurrentOrderSummary | null>(null)
  const [batches, setBatches] = useState<OrderBatchView[]>([])
  const [loadingOrder, setLoadingOrder] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)
  const [submittingBatch, setSubmittingBatch] = useState(false)
  const [clearingOrder, setClearingOrder] = useState(false)

  const resetOrderView = useCallback(() => {
    setCurrentOrder(null)
    setBatches([])
    setOrderError(null)
  }, [])

  const applyOrderState = useCallback(
    ({ order, batches: nextBatches }: UpdateOrderStateArgs) => {
      if (typeof order !== "undefined") {
        setCurrentOrder(order)
      }
      if (typeof nextBatches !== "undefined") {
        setBatches(nextBatches)
      }
    },
    [],
  )

  const loadOrderForTable = useCallback(async () => {
    if (!tableId) {
      resetOrderView()
      return
    }
    try {
      setLoadingOrder(true)
      setOrderError(null)
      const res = await fetch(`/api/orders?tableId=${encodeURIComponent(tableId)}`, { cache: "no-store" })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const message = (data && (data.error as string)) || `加载订单失败 (${res.status})`
        throw new Error(message)
      }
      applyOrderState({ order: data.order ?? null, batches: data.batches ?? [] })
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "加载订单失败"
      resetOrderView()
      setOrderError(message)
      toast({
        title: "加载订单失败",
        description: message,
        variant: "destructive",
      })
    } finally {
      setLoadingOrder(false)
    }
  }, [applyOrderState, resetOrderView, tableId, toast])

  useEffect(() => {
    loadOrderForTable()
  }, [loadOrderForTable])

  const updatePersistedItem = useCallback(
    async (itemId: string, type: "decrement" | "remove") => {
      if (!tableId) {
        toast({
          title: "请先选择桌台",
          description: "请选择右侧的桌台后再进行减菜操作。",
          variant: "destructive",
        })
        return
      }
      try {
        setLoadingOrder(true)
        setOrderError(null)
        const res = await fetch(`/api/orders/${encodeURIComponent(itemId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          const message = (data && (data.error as string)) || `更新订单失败 (${res.status})`
          throw new Error(message)
        }
        applyOrderState({ order: data.order ?? null, batches: data.batches ?? [] })
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "更新订单失败"
        setOrderError(message)
        toast({
          title: "更新订单失败",
          description: message,
          variant: "destructive",
        })
      } finally {
        setLoadingOrder(false)
      }
    },
    [applyOrderState, tableId, toast],
  )

  const submitBatch = useCallback(
    async (cart: CartItem[], paymentMethod: string) => {
      if (!tableId) {
        toast({
          title: "未选择桌台",
          description: "请先在右侧选择一个桌台，再提交下单。",
          variant: "destructive",
        })
        return false
      }
      if (cart.length === 0) {
        toast({
          title: "当前批次为空",
          description: "请先在左侧选择菜品添加到当前批次。",
        })
        return false
      }
      try {
        setSubmittingBatch(true)
        setOrderError(null)
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tableId,
            paymentMethod,
            items: cart.map((item) => ({
              menuItemId: item.id,
              quantity: item.quantity,
              notes: item.notes ?? undefined,
            })),
          }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          const message = (data && (data.error as string)) || `下单失败 (${res.status})`
          throw new Error(message)
        }
        applyOrderState({ order: data.order ?? null, batches: data.batches ?? [] })
        toast({
          title: "下单成功",
          description: "当前批次已成功提交到订单。",
        })
        return true
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "下单失败"
        setOrderError(message)
        toast({
          title: "下单失败",
          description: message,
          variant: "destructive",
        })
        return false
      } finally {
        setSubmittingBatch(false)
      }
    },
    [applyOrderState, tableId, toast],
  )

  const clearOrder = useCallback(async () => {
    if (!tableId) {
      resetOrderView()
      return true
    }
    try {
      setClearingOrder(true)
      setOrderError(null)
      const res = await fetch("/api/orders/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const message = (data && (data.error as string)) || `清空订单失败 (${res.status})`
        throw new Error(message)
      }
      applyOrderState({ order: data.order ?? null, batches: data.batches ?? [] })
      toast({
        title: "订单已清空",
        description: "当前桌台的订单已全部清空。",
      })
      return true
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "清空订单失败"
      setOrderError(message)
      toast({
        title: "清空订单失败",
        description: message,
        variant: "destructive",
      })
      return false
    } finally {
      setClearingOrder(false)
    }
  }, [applyOrderState, resetOrderView, tableId, toast])

  const maxExistingBatchNo = useMemo(
    () => (batches.length > 0 ? Math.max(...batches.map((b) => b.batchNo)) : 0),
    [batches],
  )

  return {
    currentOrder,
    batches,
    loadingOrder,
    orderError,
    submittingBatch,
    clearingOrder,
    maxExistingBatchNo,
    setOrderError,
    loadOrderForTable,
    submitBatch,
    clearOrder,
    decreasePersistedItem: (id: string) => updatePersistedItem(id, "decrement"),
    removePersistedItem: (id: string) => updatePersistedItem(id, "remove"),
    resetOrderView,
    applyOrderState,
  }
}
