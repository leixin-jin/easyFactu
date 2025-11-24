"use client"

import { useCallback, useEffect, useState } from "react"

import { useToast } from "@/hooks/use-toast"
import type { OrderBatchView } from "@/lib/order-utils"

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

export interface SubmitBatchItemInput {
  menuItemId: string
  quantity: number
  notes?: string
}

interface UsePosOrderResult {
  order: CurrentOrderSummary | null
  batches: OrderBatchView[]
  loading: boolean
  error: string | null
  submittingBatch: boolean
  clearingOrder: boolean
  reload: () => Promise<void>
  submitBatch: (args: { items: SubmitBatchItemInput[]; paymentMethod?: string }) => Promise<void>
  decrementItem: (orderItemId: string) => Promise<void>
  removeItem: (orderItemId: string) => Promise<void>
  clearOrder: () => Promise<void>
  setError: (err: string | null) => void
}

export function usePosOrder(selectedTableId: string | null | undefined): UsePosOrderResult {
  const [order, setOrder] = useState<CurrentOrderSummary | null>(null)
  const [batches, setBatches] = useState<OrderBatchView[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submittingBatch, setSubmittingBatch] = useState(false)
  const [clearingOrder, setClearingOrder] = useState(false)
  const { toast } = useToast()

  const loadOrderForTable = useCallback(
    async (tableId: string) => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/orders?tableId=${encodeURIComponent(tableId)}`, {
          cache: "no-store",
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          const message = (data && (data.error as string)) || `加载订单失败 (${res.status})`
          throw new Error(message)
        }
        setOrder(data.order ?? null)
        setBatches(data.batches ?? [])
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "加载订单失败"
        setOrder(null)
        setBatches([])
        setError(message)
        toast({
          title: "加载订单失败",
          description: message,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    },
    [toast],
  )

  useEffect(() => {
    if (!selectedTableId) {
      setOrder(null)
      setBatches([])
      setError(null)
      return
    }
    void loadOrderForTable(selectedTableId)
  }, [selectedTableId, loadOrderForTable])

  const reload = useCallback(async () => {
    if (!selectedTableId) {
      setOrder(null)
      setBatches([])
      setError(null)
      return
    }
    await loadOrderForTable(selectedTableId)
  }, [selectedTableId, loadOrderForTable])

  async function updatePersistedItem(itemId: string, type: "decrement" | "remove") {
    if (!selectedTableId) {
      toast({
        title: "请先选择桌台",
        description: "请选择右侧的桌台后再进行减菜操作。",
        variant: "destructive",
      })
      return
    }
    try {
      setLoading(true)
      setError(null)
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
      setOrder(data.order ?? null)
      setBatches(data.batches ?? [])
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "更新订单失败"
      setError(message)
      toast({
        title: "更新订单失败",
        description: message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function submitBatch(args: { items: SubmitBatchItemInput[]; paymentMethod?: string }) {
    const { items, paymentMethod } = args
    if (!selectedTableId) {
      toast({
        title: "未选择桌台",
        description: "请先在右侧选择一个桌台，再提交下单。",
        variant: "destructive",
      })
      return
    }
    if (!items.length) {
      toast({
        title: "当前批次为空",
        description: "请先在左侧选择菜品添加到当前批次。",
      })
      return
    }
    try {
      setSubmittingBatch(true)
      setError(null)
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: selectedTableId,
          paymentMethod,
          items: items.map((item) => ({
            menuItemId: item.menuItemId,
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
      setOrder(data.order ?? null)
      setBatches(data.batches ?? [])
      toast({
        title: "下单成功",
        description: "当前批次已成功提交到订单。",
      })
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "下单失败"
      setError(message)
      toast({
        title: "下单失败",
        description: message,
        variant: "destructive",
      })
    } finally {
      setSubmittingBatch(false)
    }
  }

  async function clearOrder() {
    if (!selectedTableId) {
      setOrder(null)
      setBatches([])
      setError(null)
      return
    }
    try {
      setClearingOrder(true)
      setError(null)
      const res = await fetch("/api/orders/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId: selectedTableId }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const message = (data && (data.error as string)) || `清空订单失败 (${res.status})`
        throw new Error(message)
      }
      setOrder(data.order ?? null)
      setBatches(data.batches ?? [])
      toast({
        title: "订单已清空",
        description: "当前桌台的订单已全部清空。",
      })
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "清空订单失败"
      setError(message)
      toast({
        title: "清空订单失败",
        description: message,
        variant: "destructive",
      })
    } finally {
      setClearingOrder(false)
    }
  }

  return {
    order,
    batches,
    loading,
    error,
    submittingBatch,
    clearingOrder,
    reload,
    submitBatch,
    decrementItem: (id: string) => updatePersistedItem(id, "decrement"),
    removeItem: (id: string) => updatePersistedItem(id, "remove"),
    clearOrder,
    setError,
  }
}

