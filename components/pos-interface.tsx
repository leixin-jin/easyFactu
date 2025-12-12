"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useMenuData } from "@/hooks/useMenuData"
import { useToast } from "@/hooks/use-toast"
import {
  type RestaurantTableView as TableOption,
  useRestaurantTables,
} from "@/hooks/useRestaurantTables"
import { useCheckout } from "@/hooks/useCheckout"
import { usePosOrder } from "@/hooks/usePosOrder"
import { PosMenuPane } from "@/components/PosMenuPane"
import { PosOrderSidebar } from "@/components/PosOrderSidebar"
import { PosCheckoutDialog } from "@/components/PosCheckoutDialog"
import { SplitTableDialog, MergeTableDialog } from "@/components/TableTransferDialogs"
import type {
  CheckoutReceiptData,
  MenuItem,
  ReceiptItem,
} from "@/types/pos"
import { useTableTransfer } from "@/hooks/useTableTransfer"
import { usePosCart } from "@/hooks/usePosCart"
import { getErrorMessage } from "@/lib/constants"
import { mockTables } from "@/lib/mocks"
import { PosReceiptPreview } from "@/components/PosReceiptPreview"

export function POSInterface() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const byIdParam = searchParams.get("tableId") || ""
  const tableNumberParam = searchParams.get("tableNumber") || ""

  // 桌台列表（来自 API），失败时回退到 mock
  const {
    tables,
    loading: loadingTables,
    error: loadError,
    reload: reloadTables,
  } = useRestaurantTables({ fallback: mockTables })

  const [selectedCategory, setSelectedCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTable, setSelectedTable] = useState<string>("")

  const { cart, addToCart, updateQuantity, removeFromCart, clearCart } = usePosCart()
  const [splitTableDialog, setSplitTableDialog] = useState(false)
  const [mergeTableDialog, setMergeTableDialog] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [, setOperationStatus] = useState<"closed" | "open" | "pending">("closed")
  const [printData, setPrintData] = useState<CheckoutReceiptData | null>(null)
  const [isPrinting, setIsPrinting] = useState(false)

  const { toast } = useToast()

  const {
    currentOrder,
    batches,
    loadingOrder,
    orderError,
    submittingBatch,
    clearingOrder,
    maxExistingBatchNo,
    setOrderError,
    submitBatch,
    clearOrder,
    decreasePersistedItem,
    removePersistedItem,
    applyOrderState,
  } = usePosOrder(selectedTable)

  const { split, merge, splitLoading, mergeLoading } = useTableTransfer({
    selectedTableId: selectedTable,
    applyOrderState,
    reloadTables,
    setOrderError,
  })

  const {
    state: checkoutState,
    aggregatedItems,
    subtotal,
    discountAmount,
    total,
    checkoutSubtotal,
    checkoutDiscountAmount,
    checkoutTotal,
    changeAmount,
    totalItemsCount,
    actions: checkoutActions,
  } = useCheckout({ batches, cart })

  // 菜单与分类（仅来自 API，不再使用 mock 回退）
  const { items: menuItems, categories: menuCategories } = useMenuData()

  // 结账成功后在当前窗口内触发打印
  useEffect(() => {
    if (!isPrinting || !printData) return
    const timer = setTimeout(() => {
      if (typeof window !== "undefined") {
        window.print()
      }
      setIsPrinting(false)
      router.push("/tables")
    }, 0)
    return () => clearTimeout(timer)
  }, [isPrinting, printData, router])

  // 基于 URL 参数在表加载后设定初始选中项
  useEffect(() => {
    // 优先 tableId
    if (byIdParam) {
      setSelectedTable(byIdParam)
      setOperationStatus("open")
      return
    }
    // 其次 tableNumber
    if (tableNumberParam && tables.length > 0) {
      const found = tables.find((t) => t.number === tableNumberParam)
      if (found) {
        setSelectedTable(found.id)
        setOperationStatus("open")
      }
    }
  }, [byIdParam, tableNumberParam, tables])

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nameEn.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const handleDecreasePersistedItem = (itemId: string) => {
    decreasePersistedItem(itemId)
  }

  const handleRemovePersistedItem = (itemId: string) => {
    removePersistedItem(itemId)
  }

  const {
    dialogOpen: checkoutDialog,
    discountPercent,
    paymentMethod,
    receivedAmount,
    aaMode,
    aaItems,
    aaQuantityDialogOpen,
    aaQuantityTarget,
    aaQuantityInput,
  } = checkoutState

  const handleSubmitBatch = async () => {
    const success = await submitBatch(cart, paymentMethod)
    if (success) {
      clearCart()
    }
  }

  const handleCheckout = async () => {
    if (checkoutLoading) return

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
      ? aaItems.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.price * item.quantity,
        }))
      : aggregatedItems.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.price * item.quantity,
        }))

    try {
      setCheckoutLoading(true)
      setOrderError(null)

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

      const checkoutRes = await fetch("/api/orders/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
            ? aaItems.map((item) => ({
                menuItemId: item.id,
                quantity: item.quantity,
                price: item.price,
              }))
            : undefined,
        }),
      })

      const checkoutData = await checkoutRes.json().catch(() => null)

      if (!checkoutRes.ok) {
        const rawMessage = (checkoutData && (checkoutData.error as string)) || ""
        const code = (checkoutData && (checkoutData.code as string)) || ""
        const message = code
          ? getErrorMessage(code, rawMessage)
          : rawMessage || `结账失败 (${checkoutRes.status})`

        setOrderError(message)
        toast({
          title: "结账失败",
          description: message,
          variant: "destructive",
        })
        return
      }

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
    } finally {
      setCheckoutLoading(false)
    }
  }

  const handleClearOrder = async () => {
    const cleared = await clearOrder()
    if (cleared) {
      clearCart()
      checkoutActions.resetCheckout()
    }
  }

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

  const handleAggregatedItemClick = (item: {
    id: string
    name: string
    quantity: number
    price: number
  }) => {
    checkoutActions.handleAggregatedItemSelection(item)
  }

  const handleEditAaItemQuantity = (itemId: string) => {
    if (!aaMode) return
    const target = aggregatedItems.find((item) => item.id === itemId)
    if (!target) return
    const existing = aaItems.find((aa) => aa.id === itemId)
    checkoutActions.openAaQuantityDialog(
      {
        itemId: target.id,
        name: target.name,
        maxQuantity: target.quantity,
        price: target.price,
      },
      existing ? existing.quantity : 1,
    )
  }

  const handleOpenSplitDialog = () => {
    if (!selectedTable) {
      toast({
        title: "未选择桌台",
        description: "请先在右侧选择一个桌台，再拆台。",
        variant: "destructive",
      })
      return
    }
    if (loadingOrder) {
      toast({
        title: "正在加载订单",
        description: "请稍候，订单加载完成后再拆台。",
        variant: "destructive",
      })
      return
    }
    if (batches.length === 0) {
      toast({
        title: "当前订单为空",
        description: "没有可拆分的已下单菜品。",
        variant: "destructive",
      })
      return
    }
    setSplitTableDialog(true)
  }

  const handleOpenMergeDialog = () => {
    if (!selectedTable) {
      toast({
        title: "未选择桌台",
        description: "请先在右侧选择一个桌台，再并台。",
        variant: "destructive",
      })
      return
    }
    setMergeTableDialog(true)
  }

  return (
    <>
      <div className="h-[calc(100vh-8rem)] flex gap-4 print:hidden">
      <PosMenuPane
        selectedTable={selectedTable}
        tables={tables}
        tableNumberParam={tableNumberParam}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        menuCategories={menuCategories}
        filteredItems={filteredItems}
        onAddToCart={addToCart}
      />

      {/* Right side - Cart */}
      <PosOrderSidebar
        tables={tables}
        loadingTables={loadingTables}
        loadError={loadError}
        selectedTable={selectedTable}
        onSelectedTableChange={setSelectedTable}
        totalItemsCount={totalItemsCount}
        loadingOrder={loadingOrder}
        batches={batches}
        cart={cart}
        onDecreasePersistedItem={handleDecreasePersistedItem}
        onRemovePersistedItem={handleRemovePersistedItem}
        onUpdateCartQuantity={updateQuantity}
        onRemoveFromCart={removeFromCart}
        subtotal={subtotal}
        discount={discountPercent}
        discountAmount={discountAmount}
        total={total}
        orderError={orderError}
        onSubmitBatch={handleSubmitBatch}
        onOpenCheckout={handleOpenCheckout}
        onClearOrder={handleClearOrder}
        onAA={handleAA}
        submittingBatch={submittingBatch}
        clearingOrder={clearingOrder}
        maxExistingBatchNo={maxExistingBatchNo}
        onOpenSplit={handleOpenSplitDialog}
        onOpenMerge={handleOpenMergeDialog}
      />

      <PosCheckoutDialog
        open={checkoutDialog}
        onOpenChange={(open) => {
          if (!open) {
            checkoutActions.closeCheckout()
          }
        }}
        tables={tables}
        selectedTable={selectedTable}
        tableNumberParam={tableNumberParam}
        batches={batches}
        cart={cart}
        maxExistingBatchNo={maxExistingBatchNo}
        aggregatedItems={aggregatedItems}
        aaMode={aaMode}
        aaItems={aaItems}
        onClearAAItems={checkoutActions.clearAaItems}
        onAggregatedItemClick={handleAggregatedItemClick}
        onRemoveAAItem={checkoutActions.removeAaItem}
        onEditAAItemQuantity={handleEditAaItemQuantity}
        aaQuantityDialogOpen={aaQuantityDialogOpen}
        aaQuantityTarget={aaQuantityTarget}
        aaQuantityInput={aaQuantityInput}
        onAaQuantityInputChange={checkoutActions.setAaQuantityInput}
        onConfirmAaQuantity={() => checkoutActions.confirmAaQuantity(aaQuantityInput)}
        onCancelAaQuantity={checkoutActions.cancelAaQuantityDialog}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={checkoutActions.setPaymentMethod}
        receivedAmount={receivedAmount}
        onReceivedAmountChange={checkoutActions.setReceivedAmount}
        changeAmount={changeAmount}
        discount={discountPercent}
        onDiscountChange={checkoutActions.setDiscount}
        checkoutSubtotal={checkoutSubtotal}
        checkoutDiscountAmount={checkoutDiscountAmount}
        checkoutTotal={checkoutTotal}
        currentOrderPaidAmount={currentOrder?.paidAmount ?? 0}
        checkoutLoading={checkoutLoading}
        onCheckout={handleCheckout}
      />

      <SplitTableDialog
        open={splitTableDialog}
        onOpenChange={setSplitTableDialog}
        sourceTableId={selectedTable}
        tables={tables}
        batches={batches}
        loading={loadingOrder}
        submitting={splitLoading}
        onConfirm={async ({ targetTableId, items, moveAll }) => {
          if (!selectedTable) {
            toast({
              title: "未选择桌台",
              description: "请先选择桌台后再拆台。",
              variant: "destructive",
            })
            return
          }
          await split({
            sourceTableId: selectedTable,
            targetTableId,
            items,
            moveAll,
          })
        }}
      />

      <MergeTableDialog
        open={mergeTableDialog}
        onOpenChange={setMergeTableDialog}
        targetTableId={selectedTable}
        tables={tables}
        submitting={mergeLoading}
        onConfirm={async ({ sourceTableId, items, moveAll }) => {
          if (!selectedTable) {
            toast({
              title: "未选择桌台",
              description: "请先选择桌台后再并台。",
              variant: "destructive",
            })
            return
          }
          await merge({
            sourceTableId,
            targetTableId: selectedTable,
            items,
            moveAll,
          })
        }}
      />
    </div>

    {printData && (
      <PosReceiptPreview
        data={printData}
        onClose={() => {
          setPrintData(null)
          setIsPrinting(false)
        }}
        onPrint={() => {
          if (typeof window !== "undefined") {
            window.print()
          }
        }}
      />
    )}
    </>
  )
}
