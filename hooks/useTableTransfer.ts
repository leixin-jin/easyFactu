"use client"

import { useCallback, useState } from "react"

import { useToast } from "@/hooks/use-toast"
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
  mode: "split" | "merge"
  sourceTableId: string
  targetTableId: string
  items: TransferItemInput[]
  moveAll?: boolean
}

export function useTableTransfer(options: UseTableTransferOptions) {
  const { selectedTableId, applyOrderState, reloadTables, setOrderError } = options
  const { toast } = useToast()
  const [splitLoading, setSplitLoading] = useState(false)
  const [mergeLoading, setMergeLoading] = useState(false)

  const runTransfer = useCallback(
    async (args: TransferArgs) => {
      const { mode } = args
      const setLoading = mode === "split" ? setSplitLoading : setMergeLoading
      setLoading(true)
      setOrderError(null)
      try {
        const res = await fetch("/api/orders/transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args),
        })
        const data: TransferResponsePayload | { error?: string; code?: string } | null =
          await res.json().catch(() => null)

        if (!res.ok) {
          const message =
            (data && "error" in data && typeof data.error === "string" && data.error) ||
            `操作失败 (${res.status})`
          toast({
            title: mode === "split" ? "拆台失败" : "并台失败",
            description: message,
            variant: "destructive",
          })
          setOrderError(message)
          return null
        }

        const payload = data as TransferResponsePayload
        if (payload.source && payload.source.tableId === selectedTableId) {
          applyOrderState({
            order: payload.source.order ?? null,
            batches: payload.source.batches ?? [],
          })
        }
        if (payload.target && payload.target.tableId === selectedTableId) {
          applyOrderState({
            order: payload.target.order ?? null,
            batches: payload.target.batches ?? [],
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
    [applyOrderState, reloadTables, selectedTableId, setOrderError, toast],
  )

  const split = useCallback(
    (args: Omit<TransferArgs, "mode">) => runTransfer({ ...args, mode: "split" }),
    [runTransfer],
  )

  const merge = useCallback(
    (args: Omit<TransferArgs, "mode">) => runTransfer({ ...args, mode: "merge" }),
    [runTransfer],
  )

  return {
    split,
    merge,
    splitLoading,
    mergeLoading,
  }
}
