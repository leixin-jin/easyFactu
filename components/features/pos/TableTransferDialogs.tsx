"use client"

import { useEffect, useMemo, useState } from "react"
import { Minus, Plus } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import type { OrderBatchView } from "@/types/pos"
import type { RestaurantTableView } from "@/hooks/useRestaurantTables"

interface TransferableItem {
  id: string
  name: string
  quantity: number
  price: number
  batchNo: number
}

function toTransferableItems(batches: OrderBatchView[]): TransferableItem[] {
  return batches.flatMap((batch) =>
    batch.items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      batchNo: batch.batchNo,
    })),
  )
}

interface ItemSelectorProps {
  items: TransferableItem[]
  selected: Record<string, number>
  onChange: (id: string, value: number) => void
  disabled?: boolean
}

function ItemSelector({ items, selected, onChange, disabled }: ItemSelectorProps) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">当前没有可操作的菜品</p>
  }

  return (
    <div className="space-y-2">
      <ScrollArea className="max-h-64 pr-2">
        <div className="space-y-3">
          {items.map((item) => {
            const value = selected[item.id] ?? 0
            const max = item.quantity
            return (
              <div key={item.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-medium text-sm text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      第 {item.batchNo} 批 · 可拆 {item.quantity} 份 · 单价 €{item.price.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      disabled={disabled || value <= 0}
                      onClick={() => onChange(item.id, Math.max(0, value - 1))}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Input
                      type="number"
                    value={value > 0 ? value : ""}
                    min={0}
                    max={max}
                    disabled={disabled}
                    onChange={(e) => {
                      const parsed = Number(e.target.value)
                      if (Number.isNaN(parsed)) {
                        onChange(item.id, 0)
                        return
                      }
                      const nextValue = Math.min(Math.max(0, Math.floor(parsed)), max)
                      onChange(item.id, nextValue)
                    }}
                    className="w-16 text-center"
                  />
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      disabled={disabled || value >= max}
                      onClick={() => onChange(item.id, Math.min(max, value + 1))}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}

interface SplitTableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceTableId: string
  tables: RestaurantTableView[]
  batches: OrderBatchView[]
  loading?: boolean
  submitting?: boolean
  onConfirm: (payload: { targetTableId: string; items: Array<{ orderItemId: string; quantity: number }>; moveAll: boolean }) => Promise<void>
}

export function SplitTableDialog({
  open,
  onOpenChange,
  sourceTableId,
  tables,
  batches,
  loading = false,
  submitting = false,
  onConfirm,
}: SplitTableDialogProps) {
  const { toast } = useToast()
  const items = useMemo(() => toTransferableItems(batches), [batches])
  const [targetTableId, setTargetTableId] = useState("")
  const [selected, setSelected] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!open) {
      setTargetTableId("")
      setSelected({})
    }
  }, [open])

  const handleSelectChange = (id: string, value: number) => {
    const next = { ...selected }
    if (value <= 0) {
      delete next[id]
    } else {
      next[id] = value
    }
    setSelected(next)
  }

  const selectAll = () => {
    const next: Record<string, number> = {}
    items.forEach((item) => {
      next[item.id] = item.quantity
    })
    setSelected(next)
  }

  const selectedItems = useMemo(
    () => items.filter((item) => selected[item.id] > 0).map((item) => ({
      orderItemId: item.id,
      quantity: selected[item.id],
    })),
    [items, selected],
  )

  const moveAll =
    selectedItems.length === items.length &&
    items.every((item) => selected[item.id] === item.quantity && item.quantity > 0)

  const handleConfirm = async () => {
    if (!sourceTableId) {
      toast({
        title: "未选择桌台",
        description: "请先选择当前桌台后再拆台。",
        variant: "destructive",
      })
      return
    }
    if (!targetTableId) {
      toast({
        title: "未选择目标桌台",
        description: "请选择要拆到的桌台。",
        variant: "destructive",
      })
      return
    }
    if (items.length === 0) {
      toast({
        title: "当前订单为空",
        description: "没有可拆分的菜品。",
        variant: "destructive",
      })
      return
    }
    if (selectedItems.length === 0) {
      toast({
        title: "未选择菜品",
        description: "请选择至少一项菜品进行拆台。",
        variant: "destructive",
      })
      return
    }
    await onConfirm({
      targetTableId,
      items: selectedItems,
      moveAll,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>拆台</DialogTitle>
          <DialogDescription>选择要拆分的菜品到目标桌台</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">目标桌台</p>
            <Select value={targetTableId} onValueChange={setTargetTableId} disabled={submitting || loading}>
              <SelectTrigger>
                <SelectValue placeholder="选择目标桌台" />
              </SelectTrigger>
              <SelectContent>
                {tables
                  .filter((t) => t.id !== sourceTableId)
                  .map((table) => (
                    <SelectItem key={table.id} value={table.id}>
                      {table.number}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">选择菜品</p>
            <Button variant="ghost" size="sm" disabled={items.length === 0 || submitting} onClick={selectAll}>
              整单拆台
            </Button>
          </div>
          <ItemSelector items={items} selected={selected} onChange={handleSelectChange} disabled={submitting || loading} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={submitting || loading}>
            {submitting ? "处理中..." : "确认拆台"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface MergeTableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetTableId: string
  tables: RestaurantTableView[]
  submitting?: boolean
  onConfirm: (payload: {
    sourceTableId: string
    items: Array<{ orderItemId: string; quantity: number }>
    moveAll: boolean
  }) => Promise<void>
}

export function MergeTableDialog({
  open,
  onOpenChange,
  targetTableId,
  tables,
  submitting = false,
  onConfirm,
}: MergeTableDialogProps) {
  const { toast } = useToast()
  const [sourceTableId, setSourceTableId] = useState("")
  const [loadingItems, setLoadingItems] = useState(false)
  const [batches, setBatches] = useState<OrderBatchView[]>([])
  const items = useMemo(() => toTransferableItems(batches), [batches])
  const [selected, setSelected] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!open) {
      setSourceTableId("")
      setSelected({})
      setBatches([])
    }
  }, [open])

  const handleSelectChange = (id: string, value: number) => {
    const next = { ...selected }
    if (value <= 0) {
      delete next[id]
    } else {
      next[id] = value
    }
    setSelected(next)
  }

  const fetchOrderItems = async (tableId: string) => {
    if (!tableId) {
      setBatches([])
      return
    }
    setLoadingItems(true)
    setSelected({})
    try {
      const res = await fetch(`/api/orders?tableId=${encodeURIComponent(tableId)}`, { cache: "no-store" })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const message = (data && data.error) || "加载订单失败"
        throw new Error(message)
      }
      const incomingBatches: OrderBatchView[] = data?.batches ?? []
      setBatches(incomingBatches)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "加载订单失败"
      setBatches([])
      toast({
        title: "加载失败",
        description: message,
        variant: "destructive",
      })
    } finally {
      setLoadingItems(false)
    }
  }

  const handleSourceChange = (value: string) => {
    setSourceTableId(value)
    fetchOrderItems(value)
  }

  const selectAll = () => {
    const next: Record<string, number> = {}
    items.forEach((item) => {
      next[item.id] = item.quantity
    })
    setSelected(next)
  }

  const selectedItems = useMemo(
    () => items.filter((item) => selected[item.id] > 0).map((item) => ({
      orderItemId: item.id,
      quantity: selected[item.id],
    })),
    [items, selected],
  )

  const moveAll =
    selectedItems.length === items.length &&
    items.every((item) => selected[item.id] === item.quantity && item.quantity > 0)

  const handleConfirm = async () => {
    if (!targetTableId) {
      toast({
        title: "未选择桌台",
        description: "请先选择当前桌台后再并台。",
        variant: "destructive",
      })
      return
    }
    if (!sourceTableId) {
      toast({
        title: "未选择来源桌台",
        description: "请选择要并入的桌台。",
        variant: "destructive",
      })
      return
    }
    if (items.length === 0) {
      toast({
        title: "来源桌台无订单",
        description: "该桌台没有可并入的菜品。",
        variant: "destructive",
      })
      return
    }
    if (selectedItems.length === 0) {
      toast({
        title: "未选择菜品",
        description: "请选择至少一项菜品进行并台。",
        variant: "destructive",
      })
      return
    }
    await onConfirm({
      sourceTableId,
      items: selectedItems,
      moveAll,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>并台</DialogTitle>
          <DialogDescription>选择来源桌台并将菜品并入当前桌台</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">来源桌台</p>
            <Select
              value={sourceTableId}
              onValueChange={handleSourceChange}
              disabled={submitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择来源桌台" />
              </SelectTrigger>
              <SelectContent>
                {tables
                  .filter((t) => t.id !== targetTableId)
                  .map((table) => (
                    <SelectItem key={table.id} value={table.id}>
                      {table.number}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">选择要并入的菜品</p>
            <Button variant="ghost" size="sm" disabled={items.length === 0 || submitting} onClick={selectAll}>
              整单并台
            </Button>
          </div>
          <ItemSelector
            items={items}
            selected={selected}
            onChange={handleSelectChange}
            disabled={submitting || loadingItems}
          />
          {loadingItems && (
            <p className="text-xs text-muted-foreground">正在加载来源桌台的订单...</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={submitting || loadingItems}>
            {submitting ? "处理中..." : "确认并台"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
