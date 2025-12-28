"use client"

import { useState } from "react"

import { useToast } from "@/hooks/use-toast"
import { useCheckout as useCheckoutMutation } from "@/lib/queries"
import type { RestaurantTableView } from "@/hooks/useRestaurantTables"
import type {
    CartItem,
    CheckoutReceiptData,
    CurrentOrderSummary,
    OrderBatchView,
    ReceiptItem,
} from "@/types/pos"

/**
 * 结账状态管理接口
 */
interface CheckoutState {
    dialogOpen: boolean
    discountPercent: number
    paymentMethod: string
    receivedAmount: number
    aaMode: boolean
    aaItems: Array<{ id: string; name: string; quantity: number; price: number }>
}

/**
 * 结账操作接口
 */
interface CheckoutActions {
    openFullCheckout: () => void
    openAACheckout: () => void
    closeCheckout: () => void
    resetCheckout: () => void
}

/**
 * Hook 参数接口
 */
export interface UsePosCheckoutFlowParams {
    selectedTable: string
    cart: CartItem[]
    batches: OrderBatchView[]
    currentOrder: CurrentOrderSummary | null
    tables: RestaurantTableView[]
    tableNumberParam: string
    checkoutState: CheckoutState
    checkoutActions: CheckoutActions
    aggregatedItems: Array<{ id: string; name: string; quantity: number; price: number }>
    checkoutSubtotal: number
    checkoutDiscountAmount: number
    checkoutTotal: number
    clearCart: () => void
    reloadTables: () => Promise<void>
    applyOrderState: (state: { order: CurrentOrderSummary | null; batches: OrderBatchView[] }) => void
    setOrderError: (error: string | null) => void
}

/**
 * Hook 返回值接口
 */
export interface UsePosCheckoutFlowReturn {
    // 结账操作
    handleCheckout: () => Promise<void>
    handleAA: () => void
    handleOpenCheckout: () => void

    // 结账状态 - 必须传递给 PosCheckoutDialog
    isCheckoutLoading: boolean

    // 打印状态
    printData: CheckoutReceiptData | null
    isPrinting: boolean
    setPrintData: (data: CheckoutReceiptData | null) => void
    setIsPrinting: (value: boolean) => void
}

/**
 * POS 结账流程 Hook
 * 抽取结账核心逻辑，包括结账、AA 结账、打开结账对话框等
 */
export function usePosCheckoutFlow(params: UsePosCheckoutFlowParams): UsePosCheckoutFlowReturn {
    const {
        selectedTable,
        cart,
        batches,
        currentOrder,
        tables,
        tableNumberParam,
        checkoutState,
        checkoutActions,
        aggregatedItems,
        checkoutSubtotal,
        checkoutDiscountAmount,
        checkoutTotal,
        clearCart,
        reloadTables,
        applyOrderState,
        setOrderError,
    } = params

    const { toast } = useToast()
    const checkoutMutation = useCheckoutMutation()

    // 打印状态
    const [printData, setPrintData] = useState<CheckoutReceiptData | null>(null)
    const [isPrinting, setIsPrinting] = useState(false)

    // 从 checkoutState 解构需要的字段
    const { discountPercent, paymentMethod, receivedAmount, aaMode, aaItems } = checkoutState

    /**
     * 执行结账
     */
    const handleCheckout = async () => {
        if (checkoutMutation.isPending) return

        if (!selectedTable) {
            toast({
                title: "未选择桌台",
                description: "请先在右侧选择一个桌台，再进行结账。",
                variant: "destructive",
            })
            return
        }

        if (cart.length > 0) {
            toast({
                title: "存在未提交菜品",
                description: "请先点击「下单」提交草稿批次后再结账。",
                variant: "destructive",
            })
            return
        }

        if (!currentOrder || batches.length === 0) {
            toast({
                title: "当前订单为空",
                description: "请先添加菜品并下单后再进行结账。",
                variant: "destructive",
            })
            return
        }

        if (aaMode && aaItems.length === 0) {
            toast({
                title: "未选择 AA 菜品",
                description: "请在中间的订单总结区域点击菜品，选择要 AA 结账的内容。",
                variant: "destructive",
            })
            return
        }

        const checkoutSubtotalValue = checkoutSubtotal
        const checkoutDiscountAmountValue = checkoutDiscountAmount
        const checkoutTotalValue = checkoutTotal

        const effectiveReceived =
            receivedAmount != null && receivedAmount > 0 ? receivedAmount : checkoutTotalValue

        if (checkoutTotalValue <= 0) {
            toast({
                title: "应付金额为 0",
                description: "请确认订单金额后再结账。",
                variant: "destructive",
            })
            return
        }

        if (effectiveReceived < checkoutTotalValue) {
            toast({
                title: "已收金额不足",
                description: "已收金额不能小于应付金额。",
                variant: "destructive",
            })
            return
        }

        const itemsForReceipt: ReceiptItem[] = aaMode
            ? aaItems.map((item: { name: string; quantity: number; price: number }) => ({
                name: item.name,
                quantity: item.quantity,
                unitPrice: item.price,
                totalPrice: item.price * item.quantity,
            }))
            : aggregatedItems.map((item: { name: string; quantity: number; price: number }) => ({
                name: item.name,
                quantity: item.quantity,
                unitPrice: item.price,
                totalPrice: item.price * item.quantity,
            }))

        const orderId = currentOrder?.id ?? null

        if (!orderId) {
            const message = "未找到可结账的订单"
            setOrderError(message)
            toast({
                title: "结账失败",
                description: message,
                variant: "destructive",
            })
            return
        }

        const mode = aaMode ? "aa" : "full"

        try {
            setOrderError(null)

            const checkoutData = await checkoutMutation.mutateAsync({
                tableId: selectedTable,
                orderId,
                mode,
                paymentMethod,
                discountPercent,
                clientSubtotal: checkoutSubtotalValue,
                clientTotal: checkoutTotalValue,
                receivedAmount: effectiveReceived,
                changeAmount: effectiveReceived - checkoutTotalValue,
                aaItems: aaMode
                    ? aaItems.map((item: { id: string; quantity: number; price: number }) => ({
                        menuItemId: item.id,
                        quantity: item.quantity,
                        price: item.price,
                    }))
                    : undefined,
            })

            const tableNumber =
                tables.find((t) => t.id === selectedTable)?.number || tableNumberParam || ""

            if (aaMode) {
                applyOrderState({ order: checkoutData.order ?? null, batches: checkoutData.batches ?? [] })
            } else {
                applyOrderState({ order: null, batches: [] })
            }

            checkoutActions.resetCheckout()
            clearCart()

            // 刷新桌台列表，确保状态变为 idle
            await reloadTables()

            setPrintData({
                mode,
                orderId,
                tableNumber,
                paidAt: new Date().toLocaleString(),
                paymentMethod,
                subtotal: checkoutSubtotalValue,
                discountPercent,
                discountAmount: checkoutDiscountAmountValue,
                total: checkoutTotalValue,
                receivedAmount: effectiveReceived,
                changeAmount: Math.max(0, effectiveReceived - checkoutTotalValue),
                items: itemsForReceipt,
            })
            setIsPrinting(true)

            toast({
                title: "结账成功",
                description: "订单已结账并生成交易记录，正在准备打印小票。",
            })
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "结账失败"
            setOrderError(message)
            toast({
                title: "结账失败",
                description: message,
                variant: "destructive",
            })
        }
    }

    /**
     * 打开 AA 结账模式
     */
    const handleAA = () => {
        if (!selectedTable || (cart.length === 0 && batches.length === 0)) {
            return
        }
        if (cart.length > 0) {
            toast({
                title: "存在未提交菜品",
                description: "当前还有未提交的菜品，请先点击「下单」后再进行 AA 结账。",
                variant: "destructive",
            })
            return
        }
        if (!currentOrder || batches.length === 0) {
            toast({
                title: "当前订单为空",
                description: "请先添加菜品并下单后再进行 AA 结账。",
                variant: "destructive",
            })
            return
        }
        checkoutActions.openAACheckout()
    }

    /**
     * 打开普通结账对话框
     */
    const handleOpenCheckout = () => {
        if (!selectedTable) {
            return
        }
        if (cart.length > 0) {
            toast({
                title: "存在未提交菜品",
                description: "请先点击「下单」提交草稿批次后再结账。",
                variant: "destructive",
            })
            return
        }
        if (!currentOrder || batches.length === 0) {
            toast({
                title: "当前订单为空",
                description: "请先添加菜品并下单后再进行结账。",
                variant: "destructive",
            })
            return
        }
        checkoutActions.openFullCheckout()
    }

    return {
        handleCheckout,
        handleAA,
        handleOpenCheckout,
        isCheckoutLoading: checkoutMutation.isPending,
        printData,
        isPrinting,
        setPrintData,
        setIsPrinting,
    }
}
