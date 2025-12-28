"use client"

import { Plus, Minus, Trash2, ShoppingCart, Receipt, DivideCircle, Split, Copy } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { PosHeader } from "./PosHeader"
import type { RestaurantTableView } from "@/hooks/useRestaurantTables"
import type { OrderBatchView, CartItem } from "@/types/pos"

/**
 * PosOrderPanel 组件 Props
 */
export interface PosOrderPanelProps {
    // 桌台选择
    tables: RestaurantTableView[]
    loadingTables: boolean
    loadError: string | null
    selectedTable: string
    onSelectedTableChange: (tableId: string) => void
    tableNumberParam: string

    // 订单数据
    batches: OrderBatchView[]
    cart: CartItem[]
    loadingOrder: boolean
    orderError: string | null
    totalItemsCount: number

    // 订单操作
    onDecreasePersistedItem: (itemId: string) => void
    onRemovePersistedItem: (itemId: string) => void
    onUpdateCartQuantity: (itemId: string, quantity: number) => void
    onRemoveFromCart: (itemId: string) => void

    // 金额
    subtotal: number
    discountPercent: number
    discountAmount: number
    total: number

    // 按钮操作
    onSubmitBatch: () => void
    onOpenCheckout: () => void
    onClearOrder: () => void
    onAA: () => void
    onOpenSplit: () => void
    onOpenMerge: () => void

    // 状态
    submittingBatch: boolean
    clearingOrder: boolean
    maxExistingBatchNo: number
}

/**
 * POS 订单面板组件
 * 封装订单侧边栏，包括桌台选择、订单列表、操作按钮
 */
export function PosOrderPanel({
    tables,
    loadingTables,
    loadError,
    selectedTable,
    onSelectedTableChange,
    tableNumberParam,
    batches,
    cart,
    loadingOrder,
    orderError,
    totalItemsCount,
    onDecreasePersistedItem,
    onRemovePersistedItem,
    onUpdateCartQuantity,
    onRemoveFromCart,
    subtotal,
    discountPercent,
    discountAmount,
    total,
    onSubmitBatch,
    onOpenCheckout,
    onClearOrder,
    onAA,
    onOpenSplit,
    onOpenMerge,
    submittingBatch,
    clearingOrder,
    maxExistingBatchNo,
}: PosOrderPanelProps) {
    return (
        <Card className="w-96 h-full flex flex-col bg-card border-border">
            <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold text-foreground">当前订单</h2>
                    </div>
                    <Badge variant="secondary">{totalItemsCount} 项</Badge>
                </div>

                {/* 桌台选择 - 使用 PosHeader variant="order" */}
                <PosHeader
                    variant="order"
                    tables={tables}
                    loadingTables={loadingTables}
                    loadError={loadError}
                    selectedTable={selectedTable}
                    onSelectedTableChange={onSelectedTableChange}
                    tableNumberParam={tableNumberParam}
                />
            </div>

            {/* Cart items: 先展示已落库批次，再展示当前未提交批次 */}
            <ScrollArea className="p-4 h-[300px]">
                {loadingOrder ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12 text-sm text-muted-foreground">
                        正在加载订单...
                    </div>
                ) : batches.length === 0 && cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                        <ShoppingCart className="w-12 h-12 text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">当前订单为空</p>
                        <p className="text-sm text-muted-foreground mt-1">在左侧选择菜品并点击「下单」提交</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {batches.map((batch) => {
                            const isOddBatch = batch.batchNo % 2 === 1
                            const batchLabel = batch.batchNo === 1 ? "第 1 批下单" : `第 ${batch.batchNo} 批加菜`
                            const cardClassName = isOddBatch
                                ? "p-3 bg-muted/30 border-border"
                                : "p-3 bg-primary/5 border-primary/40"
                            const headerBadgeClassName = isOddBatch
                                ? "text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                                : "text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                            const batchTotalCount = batch.items.reduce((sum, item) => sum + item.quantity, 0)

                            return (
                                <div key={batch.batchNo} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-muted-foreground">{batchLabel}</span>
                                        <span className={headerBadgeClassName}>共 {batchTotalCount} 项</span>
                                    </div>
                                    <div className="space-y-2">
                                        {batch.items.map((item) => (
                                            <Card key={item.id} className={cardClassName}>
                                                <div className="flex gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2 mb-2">
                                                            <h3 className="font-medium text-sm text-foreground truncate">{item.name}</h3>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 flex-shrink-0 text-destructive hover:text-destructive"
                                                                onClick={() => onRemovePersistedItem(item.id)}
                                                                title="删除菜品"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-3">
                                                            <span className="text-xs text-muted-foreground">
                                                                单价 €{item.price.toFixed(2)}
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="h-7 w-7 bg-transparent"
                                                                    onClick={() => onDecreasePersistedItem(item.id)}
                                                                >
                                                                    <Minus className="w-3 h-3" />
                                                                </Button>
                                                                <span className="text-sm font-medium w-6 text-center">
                                                                    {item.quantity}
                                                                </span>
                                                            </div>
                                                            <span className="text-sm font-bold text-foreground">
                                                                总价 €{(item.price * item.quantity).toFixed(2)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}

                        {cart.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-muted-foreground">
                                        第 {maxExistingBatchNo + 1} 批（未提交）
                                    </span>
                                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                                        草稿批次
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {cart.map((item) => (
                                        <Card key={item.id} className="p-3 bg-primary/5 border-primary/40">
                                            <div className="flex gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2 mb-2">
                                                        <h3 className="font-medium text-sm text-foreground truncate">{item.name}</h3>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 flex-shrink-0 text-destructive hover:text-destructive"
                                                            onClick={() => onRemoveFromCart(item.id)}
                                                            title="删除菜品"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-3">
                                                        <span className="text-xs text-muted-foreground">
                                                            单价 €{item.price.toFixed(2)}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                className="h-7 w-7 bg-transparent"
                                                                onClick={() => onUpdateCartQuantity(item.id, -1)}
                                                            >
                                                                <Minus className="w-3 h-3" />
                                                            </Button>
                                                            <span className="text-sm font-medium w-6 text-center">
                                                                {item.quantity}
                                                            </span>
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                className="h-7 w-7 bg-transparent"
                                                                onClick={() => onUpdateCartQuantity(item.id, 1)}
                                                            >
                                                                <Plus className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                        <span className="text-sm font-bold text-foreground">
                                                            总价 €{(item.price * item.quantity).toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </ScrollArea>

            {orderError && (
                <div className="px-4 pb-1 text-xs text-destructive">{orderError}</div>
            )}

            {/* Cart summary & actions: 固定底部，始终可见 */}
            <div className="mt-auto p-4 border-t border-border space-y-3 bg-card">
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">小计</span>
                        <span className="text-foreground">€{subtotal.toFixed(2)}</span>
                    </div>
                    {discountPercent > 0 && (
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">折扣 ({discountPercent}%)</span>
                            <span className="text-destructive">-€{discountAmount.toFixed(2)}</span>
                        </div>
                    )}
                    <Separator />
                    <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">总计</span>
                        <span className="text-2xl font-bold text-primary">€{total.toFixed(2)}</span>
                    </div>
                </div>

                {/* 第一排：下单 + 结账 */}
                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant="secondary"
                        className="gap-2 bg-green-600 text-white hover:bg-green-700"
                        onClick={onSubmitBatch}
                        disabled={submittingBatch || !selectedTable || cart.length === 0}
                    >
                        <Plus className="w-4 h-4" />
                        下单
                    </Button>
                    <Button
                        className="gap-2 bg-yellow-500 text-black hover:bg-yellow-600 disabled:!bg-yellow-500 disabled:!text-black disabled:!opacity-100 disabled:cursor-not-allowed"
                        onClick={onOpenCheckout}
                        disabled={!selectedTable}
                    >
                        <Receipt className="w-4 h-4" />
                        结账
                    </Button>
                </div>

                {/* 第二排：清空 + AA 结账 */}
                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant="destructive"
                        className="gap-2"
                        onClick={onClearOrder}
                        disabled={clearingOrder || (cart.length === 0 && batches.length === 0)}
                    >
                        <Trash2 className="w-4 h-4" />
                        清空
                    </Button>
                    <Button
                        className="gap-2 bg-pink-500 text-white hover:bg-pink-600 disabled:opacity-50"
                        onClick={onAA}
                        disabled={!selectedTable || (cart.length === 0 && batches.length === 0)}
                    >
                        <DivideCircle className="w-4 h-4" />
                        AA
                    </Button>
                </div>

                {/* 第三排：拆台 + 并台 */}
                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant="outline"
                        className="gap-1 text-xs bg-transparent"
                        onClick={onOpenSplit}
                    >
                        <Split className="w-3 h-3" />
                        <span className="hidden sm:inline">拆台</span>
                    </Button>
                    <Button
                        variant="outline"
                        className="gap-1 text-xs bg-transparent"
                        onClick={onOpenMerge}
                    >
                        <Copy className="w-3 h-3" />
                        <span className="hidden sm:inline">并台</span>
                    </Button>
                </div>
            </div>
        </Card>
    )
}
