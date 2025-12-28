"use client"

import { useCallback, useState } from "react"

import { useToast } from "@/hooks/use-toast"
import { useTransferOrder } from "@/lib/queries"
import type { CurrentOrderSummary, OrderBatchView } from "@/types/pos"

interface TransferItemInput {
  orderItemId: string
  quantity: number
}

interface TransferResponsePayload {
  source?: {
    tableId: string
    order: CurrentOrderSummary | null
    batches: OrderBatchView[]
  }
  target?: {
    tableId: string
    order: CurrentOrderSummary | null
    batches: OrderBatchView[]
  }
}

interface UseTableTransferOptions {
  selectedTableId: string
  applyOrderState: (args: { order?: CurrentOrderSummary | null; batches?: OrderBatchView[] }) => void
  reloadTables: () => Promise<void>
  setOrderError: (message: string | null) => void
}

interface TransferArgs {
  sourceTableId: string
  targetTableId: string
  items: TransferItemInput[]
  moveAll?: boolean
}

export function useTableTransfer(options: UseTableTransferOptions) {
  const { selectedTableId, applyOrderState, reloadTables, setOrderError } = options
  const { toast } = useToast()
  const transferMutation = useTransferOrder()
  const [splitLoading, setSplitLoading] = useState(false)
  const [mergeLoading, setMergeLoading] = useState(false)

  const runTransfer = useCallback(
    async (args: TransferArgs & { mode: "split" | "merge" }) => {
      const { mode, sourceTableId, targetTableId, items, moveAll } = args
      const setLoading = mode === "split" ? setSplitLoading : setMergeLoading
      setLoading(true)
      setOrderError(null)
      try {
        const payload = await transferMutation.mutateAsync({
          sourceTableId,
          targetTableId,
          items: items.map((item) => ({ id: item.orderItemId, quantity: item.quantity })),
        })

        // Handle the response - the mutation onSuccess already invalidates queries
        // but we may need to update local state
        const data = payload as unknown as TransferResponsePayload
        if (data?.source && data.source.tableId === selectedTableId) {
          applyOrderState({
            order: data.source.order ?? null,
            batches: data.source.batches ?? [],
          })
        }
        if (data?.target && data.target.tableId === selectedTableId) {
          applyOrderState({
            order: data.target.order ?? null,
            batches: data.target.batches ?? [],
          })
        }

        await reloadTables()

        toast({
          title: mode === "split" ? "拆台成功" : "并台成功",
          description: mode === "split" ? "菜品已转移至目标桌台。" : "菜品已合并到当前桌台。",
        })

        return payload
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "操作失败"
        toast({
          title: mode === "split" ? "拆台失败" : "并台失败",
          description: message,
          variant: "destructive",
        })
        setOrderError(message)
        return null
      } finally {
        setLoading(false)
      }
    },
    [applyOrderState, reloadTables, selectedTableId, setOrderError, toast, transferMutation],
  )

  const split = useCallback(
    (args: TransferArgs) => runTransfer({ ...args, mode: "split" }),
    [runTransfer],
  )

  const merge = useCallback(
    (args: TransferArgs) => runTransfer({ ...args, mode: "merge" }),
    [runTransfer],
  )

  return {
    split,
    merge,
    splitLoading,
    mergeLoading,
  }
}

