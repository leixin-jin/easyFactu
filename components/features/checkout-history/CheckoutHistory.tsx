"use client"

import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  useCheckoutHistoryQuery,
  useTransactionDetailQuery,
  useReverseTransaction,
} from "@/lib/queries"
import { formatMoney } from "@/lib/money"

type SelectedCheckout = {
  transactionId: string
}

export function CheckoutHistory() {
  const { data, isLoading, error, refetch } = useCheckoutHistoryQuery({ limit: 50 })
  const [selected, setSelected] = useState<SelectedCheckout | null>(null)
  const [reversalDialogOpen, setReversalDialogOpen] = useState(false)
  const [reversalError, setReversalError] = useState<string | null>(null)

  const { data: transactionDetail, isLoading: isDetailLoading, error: detailError } = useTransactionDetailQuery(
    reversalDialogOpen ? selected?.transactionId ?? null : null
  )
  const detailErrorMessage = detailError instanceof Error ? detailError.message : null
  const reverseMutation = useReverseTransaction()

  const items = useMemo(() => data?.items ?? [], [data?.items])
  const errorMessage = error instanceof Error ? error.message : null

  const handleReverse = async () => {
    if (!selected) return
    setReversalError(null)

    try {
      await reverseMutation.mutateAsync(selected.transactionId)
      setReversalDialogOpen(false)
      setSelected(null)
      refetch()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "反结算失败"
      setReversalError(message)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground text-balance">结算记录</h1>
        <p className="text-muted-foreground mt-1">最近 50 条结算记录（最新在前）</p>
      </div>

      {errorMessage && (
        <Card className="p-4 border-red-200 bg-red-50 text-sm text-red-700">
          <div>数据加载失败：{errorMessage}</div>
          <Button className="mt-3" variant="outline" onClick={() => refetch()}>
            重试
          </Button>
        </Card>
      )}

      {isLoading ? (
        <Card className="bg-card border-border overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/50">
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">结算ID</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">桌号</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">金额</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="border-b border-border">
                    <td className="p-4">
                      <Skeleton className="h-4 w-52" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="p-4 text-right">
                      <Skeleton className="h-4 w-20 ml-auto" />
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Skeleton className="h-9 w-20" />
                        <Skeleton className="h-9 w-24" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : items.length === 0 ? (
        <Card className="p-8 bg-card border-border text-center text-muted-foreground">
          暂无结算记录
        </Card>
      ) : (
        <Card className="bg-card border-border overflow-hidden">
          <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">结算ID</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">桌号</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">金额</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.transactionId} className="border-b border-border transition-colors hover:bg-muted/30">
                    <td className="p-4">
                      <span
                        className="font-mono text-xs text-foreground truncate block max-w-[22rem]"
                        title={item.transactionId}
                      >
                        {item.transactionId}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{item.tableNumber ?? "-"}</td>
                    <td className="p-4 text-sm font-medium text-foreground text-right">€{formatMoney(item.amount)}</td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelected({ transactionId: item.transactionId })
                            setReversalDialogOpen(true)
                          }}
                        >
                          反结算
                        </Button>
                        <Button variant="outline" size="sm" disabled>
                          补打发票
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Dialog
        open={reversalDialogOpen}
        onOpenChange={(open) => {
          setReversalDialogOpen(open)
          if (!open) {
            setSelected(null)
            setReversalError(null)
          }
        }}
      >
        <DialogContent className="w-[50vmin] h-[50vmin] max-w-none sm:max-w-none flex flex-col">
          <DialogHeader>
            <DialogTitle>反结算</DialogTitle>
            <DialogDescription>整单反结算将回退所有菜品的已付数量</DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-hidden">
            {isDetailLoading ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : detailErrorMessage ? (
              <div className="p-4 text-center text-red-500">
                加载失败：{detailErrorMessage}
              </div>
            ) : !transactionDetail?.hasItems ? (
              <div className="p-4 text-center text-muted-foreground">
                该结算单无法反结算（缺少明细）
              </div>
            ) : (
              <ScrollArea className="h-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>菜品名称</TableHead>
                      <TableHead className="text-right">数量</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      // 按 menuItemId 聚合相同菜品的数量
                      const aggregated = new Map<string, { name: string; quantity: number }>()
                      for (const item of transactionDetail.items) {
                        const key = item.menuItemId
                        const existing = aggregated.get(key)
                        if (existing) {
                          existing.quantity += item.quantity
                        } else {
                          aggregated.set(key, { name: item.nameSnapshot, quantity: item.quantity })
                        }
                      }
                      return Array.from(aggregated.entries()).map(([menuItemId, { name, quantity }]) => (
                        <TableRow key={menuItemId}>
                          <TableCell>{name}</TableCell>
                          <TableCell className="text-right">{quantity}</TableCell>
                        </TableRow>
                      ))
                    })()}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </div>

          {reversalError && (
            <div className="text-sm text-red-500 px-1">
              {reversalError}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="destructive"
              onClick={handleReverse}
              disabled={!transactionDetail?.hasItems || reverseMutation.isPending}
            >
              {reverseMutation.isPending ? "处理中..." : "整单反结算"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

