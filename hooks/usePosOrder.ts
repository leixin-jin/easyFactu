"use client"

import { useCallback, useMemo } from "react"

import { useToast } from "@/hooks/use-toast"
import { useTableOrder, useCreateOrderBatch, useUpdateOrderItem, useClearOrder } from "@/lib/queries"
import type { CartItem, CurrentOrderSummary, OrderBatchView } from "@/types/pos"

interface UpdateOrderStateArgs {
  order?: CurrentOrderSummary | null
  batches?: OrderBatchView[]
}

export function usePosOrder(tableId: string) {
  const { toast } = useToast()

  const {
    data: orderData,
    isLoading: loadingOrder,
    error: queryError,
    refetch,
  } = useTableOrder(tableId)

  const createOrderMutation = useCreateOrderBatch()
  const updateItemMutation = useUpdateOrderItem()
  const clearOrderMutation = useClearOrder()

  const currentOrder: CurrentOrderSummary | null = orderData?.order ?? null
  const batches: OrderBatchView[] = useMemo(
    () => orderData?.batches ?? [],
    [orderData?.batches],
  )
  const orderError = queryError ? (queryError instanceof Error ? queryError.message : "加载订单失败") : null
  const submittingBatch = createOrderMutation.isPending
  const clearingOrder = clearOrderMutation.isPending

  const resetOrderView = useCallback(() => {
    // This is now managed by TanStack Query - refetch will reset the data
  }, [])

  const applyOrderState = useCallback(
    (_args: UpdateOrderStateArgs) => {
      // State is now managed by TanStack Query - data will auto-update on mutation success
    },
    [],
  )

  const loadOrderForTable = useCallback(async () => {
    if (!tableId) return
    await refetch()
  }, [tableId, refetch])

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
        await updateItemMutation.mutateAsync({ itemId, data: { type } })
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "更新订单失败"
        toast({
          title: "更新订单失败",
          description: message,
          variant: "destructive",
        })
      }
    },
    [tableId, toast, updateItemMutation],
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
        await createOrderMutation.mutateAsync({
          tableId,
          paymentMethod,
          items: cart.map((item) => ({
            menuItemId: item.id,
            quantity: item.quantity,
            notes: item.notes ?? undefined,
          })),
        })
        toast({
          title: "下单成功",
          description: "当前批次已成功提交到订单。",
        })
        return true
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "下单失败"
        toast({
          title: "下单失败",
          description: message,
          variant: "destructive",
        })
        return false
      }
    },
    [tableId, toast, createOrderMutation],
  )

  const clearOrder = useCallback(async () => {
    if (!tableId) {
      return true
    }
    try {
      await clearOrderMutation.mutateAsync({ tableId })
      toast({
        title: "订单已清空",
        description: "当前桌台的订单已全部清空。",
      })
      return true
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "清空订单失败"
      toast({
        title: "清空订单失败",
        description: message,
        variant: "destructive",
      })
      return false
    }
  }, [tableId, toast, clearOrderMutation])

  const maxExistingBatchNo = useMemo(
    () => (batches.length > 0 ? Math.max(...batches.map((b) => b.batchNo)) : 0),
    [batches],
  )

  // setOrderError is kept for backward compatibility but is now a no-op
  const setOrderError = useCallback((_message: string | null) => {}, [])

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
