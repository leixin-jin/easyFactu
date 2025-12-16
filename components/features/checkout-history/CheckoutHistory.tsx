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
import { useCheckoutHistoryQuery } from "@/lib/queries"
import { formatMoney } from "@/lib/money"

type SelectedCheckout = {
  transactionId: string
}

export function CheckoutHistory() {
  const { data, isLoading, error, refetch } = useCheckoutHistoryQuery({ limit: 50 })
  const [selected, setSelected] = useState<SelectedCheckout | null>(null)
  const [reversalDialogOpen, setReversalDialogOpen] = useState(false)

  const items = useMemo(() => data?.items ?? [], [data?.items])
  const errorMessage = error instanceof Error ? error.message : null

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
          }
        }}
      >
        <DialogContent className="w-[50vmin] h-[50vmin] max-w-none sm:max-w-none">
          <DialogHeader>
            <DialogTitle>反结算</DialogTitle>
            <DialogDescription>请选择需要反结算的菜品</DialogDescription>
          </DialogHeader>

          <div className="text-sm text-muted-foreground">
            {selected ? `结算ID：${selected.transactionId}` : ""}
          </div>

          <DialogFooter className="sm:justify-between">
            <Button variant="secondary" disabled>
              整单反结算
            </Button>
            <Button disabled>反结算</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

