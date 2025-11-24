"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Printer, Trash2 } from "lucide-react"

import type { CartItem, OrderBatchView, AAItemSelection } from "@/components/pos-interface"

export interface PosCheckoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tables: { id: string; number: string }[]
  selectedTable: string
  tableNumberParam: string
  batches: OrderBatchView[]
  cart: CartItem[]
  maxExistingBatchNo: number
  aggregatedItems: { id: string; name: string; quantity: number; price: number }[]
  aaMode: boolean
  aaItems: AAItemSelection[]
  onClearAAItems: () => void
  onAggregatedItemClick: (item: { id: string; name: string; quantity: number; price: number }) => void
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
  onAaQuantityInputChange: (value: number) => void
  onConfirmAaQuantity: () => void
  onCancelAaQuantity: () => void
  paymentMethod: string
  onPaymentMethodChange: (value: string) => void
  receivedAmount: number
  onReceivedAmountChange: (value: number) => void
  changeAmount: number
  discount: number
  onDiscountChange: (value: number) => void
  checkoutSubtotal: number
  checkoutDiscountAmount: number
  checkoutTotal: number
  currentOrderPaidAmount: number
  checkoutLoading: boolean
  onCheckout: () => void
}

export function PosCheckoutDialog({
  open,
  onOpenChange,
  tables,
  selectedTable,
  tableNumberParam,
  batches,
  cart,
  maxExistingBatchNo,
  aggregatedItems,
  aaMode,
  aaItems,
  onClearAAItems,
  onAggregatedItemClick,
  aaQuantityDialogOpen,
  aaQuantityTarget,
  aaQuantityInput,
  onAaQuantityInputChange,
  onConfirmAaQuantity,
  onCancelAaQuantity,
  paymentMethod,
  onPaymentMethodChange,
  receivedAmount,
  onReceivedAmountChange,
  changeAmount,
  discount,
  onDiscountChange,
  checkoutSubtotal,
  checkoutDiscountAmount,
  checkoutTotal,
  currentOrderPaidAmount,
  checkoutLoading,
  onCheckout,
}: PosCheckoutDialogProps) {
  const tableNumber = tables.find((t) => t.id === selectedTable)?.number || tableNumberParam || ""

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* 固定高度的三栏结账页面：宽度约为视口 80%，高度固定为视口高度减去上下间距 */}
      <DialogContent className="w-[80vw] max-w-[80vw] sm:max-w-[80vw] h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>订单结账</DialogTitle>
          <DialogDescription>桌台: {tableNumber}</DialogDescription>
        </DialogHeader>

        {/* 三栏布局：左订单明细 / 中间汇总+AA预留 / 右侧结账方式 */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3 flex-1 min-h-0 overflow-hidden">
          {/* 左侧：订单明细 */}
          <Card className="h-full min-h-0 bg-emerald-700/10 border-emerald-500/40 flex flex-col">
            <div className="px-4 pt-4 pb-2 border-b border-emerald-500/30 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">订单明细</h3>
                <p className="text-xs text-emerald-800/80 dark:text-emerald-100/80">
                  按批次查看菜品与金额
                </p>
              </div>
            </div>
            <div className="flex-1 min-h-0 px-4 py-3 overflow-y-auto">
              <div className="space-y-3 pb-2">
                {batches.length === 0 && cart.length === 0 ? (
                  <p className="text-sm text-muted-foreground">当前订单为空</p>
                ) : (
                  <>
                    {batches.map((batch) => (
                      <div key={batch.batchNo} className="space-y-1">
                        <div className="text-xs font-semibold text-emerald-900/80 dark:text-emerald-100/80">
                          {batch.batchNo === 1 ? "第 1 批下单" : `第 ${batch.batchNo} 批加菜`}
                        </div>
                        {batch.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between text-xs sm:text-sm text-emerald-950 dark:text-emerald-50"
                          >
                            <span className="truncate max-w-[10rem] sm:max-w-[12rem]">
                              {item.name} x{item.quantity}
                            </span>
                            <span className="font-medium">
                              €{(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                    {cart.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-emerald-900/80 dark:text-emerald-100/80">
                          第 {maxExistingBatchNo + 1} 批（未提交）
                        </div>
                        {cart.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between text-xs sm:text-sm text-emerald-950 dark:text-emerald-50"
                          >
                            <span className="truncate max-w-[10rem] sm:max-w-[12rem]">
                              {item.name} x{item.quantity}
                            </span>
                            <span className="font-medium">
                              €{(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </Card>

          {/* 中间：订单总结 + AA 区域 */}
          <Card className="h-full min-h-0 grid grid-rows-2">
            {/* 上：订单总结 */}
            <div className="p-4 border-b border-border flex flex-col min-h-0 overflow-y-auto">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-foreground">订单总结</h3>
                <p className="text-xs text-muted-foreground">按菜品汇总：菜品 × 数量</p>
              </div>
              <div className="space-y-2 pb-2 pr-2">
                {aggregatedItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">暂无菜品</p>
                ) : (
                  aggregatedItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`w-full flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                        aaMode
                          ? "cursor-pointer hover:border-primary hover:bg-primary/5"
                          : "cursor-default border-border bg-background"
                      } ${
                        aaMode && aaItems.some((aa) => aa.id === item.id)
                          ? "border-pink-500 bg-pink-50"
                          : "border-border"
                      }`}
                      onClick={() => onAggregatedItemClick(item)}
                    >
                      <span className="truncate max-w-[10rem] sm:max-w-[12rem] text-foreground">
                        {item.name}
                      </span>
                      <div className="flex flex-col items-end">
                        <span className="text-muted-foreground">x{item.quantity}</span>
                        {aaMode && (
                          <span className="mt-0.5 text-[11px] text-muted-foreground">
                            已选{" "}
                            {aaItems.find((aa) => aa.id === item.id)?.quantity ?? 0} / 剩余{" "}
                            {Math.max(
                              0,
                              item.quantity -
                                (aaItems.find((aa) => aa.id === item.id)?.quantity ?? 0),
                            )}
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* 下：AA 区域 */}
            <div className="p-4 flex flex-col min-h-0 bg-muted/40">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">AA 分单</h3>
                  <p className="text-xs text-muted-foreground">
                    点击上方菜品选择要 AA 的内容
                  </p>
                </div>
                {aaMode && aaItems.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={onClearAAItems}
                  >
                    清空
                  </Button>
                )}
              </div>
              {!aaMode ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-xs text-muted-foreground text-center leading-relaxed">
                    当前为整单结账模式。
                    <br />
                    如需按人分账，请关闭弹窗并点击底部「AA」按钮进入 AA 模式。
                  </p>
                </div>
              ) : aaItems.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-xs text-muted-foreground text-center leading-relaxed">
                    在上方「订单总结」中点击菜品即可将其加入 AA 分单。
                    <br />
                    对于数量大于 1 的菜品，会弹出小窗口让你选择 AA 数量。
                  </p>
                </div>
              ) : (
                <div className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-1">
                  {aaItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-xs sm:text-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate max-w-[10rem] sm:max-w-[12rem] text-foreground">
                            {item.name}
                          </span>
                          <span className="font-medium text-foreground">
                            €{(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>
                            单价 €{item.price.toFixed(2)} × {item.quantity}
                          </span>
                          <button
                            type="button"
                            className="underline-offset-2 hover:underline"
                            onClick={() => {
                              if (!aaQuantityTarget || aaQuantityTarget.itemId !== item.id) {
                                // 交由上层重新设置数量弹窗的目标和输入值
                                onAaQuantityInputChange(item.quantity)
                              }
                            }}
                          >
                            修改数量
                          </button>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="ml-2 h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          onClearAAItems() // 上层会重建列表
                        }
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* 右侧：结账方式与支付摘要 */}
          <Card className="h-full min-h-0 flex flex-col p-4">
            <div className="space-y-4 flex-1 min-h-0 overflow-y-auto pr-1">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">支付方式</h3>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <Button
                    type="button"
                    variant={paymentMethod === "cash" ? "default" : "outline"}
                    className="w-full"
                    onClick={() => onPaymentMethodChange("cash")}
                  >
                    现金
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMethod === "card" ? "default" : "outline"}
                    className="w-full"
                    onClick={() => onPaymentMethodChange("card")}
                  >
                    刷卡
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="checkout-received">已收金额</Label>
                <Input
                  id="checkout-received"
                  type="number"
                  min="0"
                  value={receivedAmount === 0 ? "" : receivedAmount}
                  onChange={(e) => {
                    const value = Number(e.target.value)
                    onReceivedAmountChange(
                      Number.isNaN(value) || value < 0 ? 0 : value,
                    )
                  }}
                  placeholder="输入已收金额"
                />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">应找</span>
                  <span className="text-foreground">
                    €{changeAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="checkout-discount">折扣 (%)</Label>
                <div className="flex gap-2">
                  <Input
                    id="checkout-discount"
                    type="number"
                    min="0"
                    max="100"
                    value={discount === 0 ? "" : discount}
                    onChange={(e) =>
                      onDiscountChange(
                        Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                      )
                    }
                    className="flex-1"
                    placeholder="请输入折扣"
                  />
                  <Button type="button" variant="outline" onClick={() => onDiscountChange(10)}>
                    10%
                  </Button>
                  <Button type="button" variant="outline" onClick={() => onDiscountChange(20)}>
                    20%
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">小计</span>
                  <span className="text-foreground">
                    €{checkoutSubtotal.toFixed(2)}
                  </span>
                </div>
                {discount > 0 && checkoutSubtotal > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">折扣 ({discount}%)</span>
                    <span className="text-destructive">
                      -€{checkoutDiscountAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">应付金额</span>
                  <span className="text-2xl font-bold text-primary">
                    €{checkoutTotal.toFixed(2)}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  已收合计：€{currentOrderPaidAmount.toFixed(2)} · 本次应收：
                  €{checkoutTotal.toFixed(2)}
                </p>
                {aaMode && (
                  <p className="text-[11px] text-muted-foreground">
                    当前金额基于 AA 分单计算，仅包含已加入 AA 的菜品。
                  </p>
                )}
              </div>
            </div>

            <DialogFooter className="pt-4 px-0 shrink-0">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={checkoutLoading}
              >
                取消
              </Button>
              <Button
                onClick={onCheckout}
                className="gap-2"
                disabled={checkoutLoading || checkoutTotal <= 0}
              >
                {checkoutLoading ? (
                  "处理中..."
                ) : (
                  <>
                    <Printer className="w-4 h-4" />
                    确认并打印
                  </>
                )}
              </Button>
            </DialogFooter>
          </Card>
        </div>
      </DialogContent>

      {/* AA 数量选择弹窗 —— 交互由父组件控制 open/onChange，只负责 UI */}
      <Dialog open={aaQuantityDialogOpen} onOpenChange={(open) => (open ? undefined : onCancelAaQuantity())}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>选择 AA 数量</DialogTitle>
            <DialogDescription>
              {aaQuantityTarget
                ? `${aaQuantityTarget.name}（最多 x${aaQuantityTarget.maxQuantity}）`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="aa-quantity-input">AA 数量</Label>
            <Input
              id="aa-quantity-input"
              type="number"
              min={1}
              max={aaQuantityTarget?.maxQuantity ?? 1}
              value={aaQuantityInput}
              onChange={(e) => {
                const raw = Number(e.target.value) || 0
                const max = aaQuantityTarget?.maxQuantity ?? 1
                const clamped = Math.min(max, Math.max(1, raw))
                onAaQuantityInputChange(clamped)
              }}
            />
            <p className="text-xs text-muted-foreground">
              不能超过该菜品在订单中的总数量。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onCancelAaQuantity}>
              取消
            </Button>
            <Button onClick={onConfirmAaQuantity}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
