"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { useMenuData } from "@/hooks/useMenuData"
import { useToast } from "@/hooks/use-toast"
import { useRestaurantTables } from "@/hooks/useRestaurantTables"
import { useCheckout as useCheckoutState } from "@/hooks/useCheckout"
import { usePosOrder } from "@/hooks/usePosOrder"
import { usePosCart } from "@/hooks/usePosCart"
import { useTableTransfer } from "@/hooks/useTableTransfer"
import { mockTables } from "@/lib/mocks"

import { PosHeader } from "./PosHeader"
import { PosContent } from "./PosContent"
import { PosOrderPanel } from "./PosOrderPanel"
import { PosCheckoutDialog } from "./PosCheckoutDialog"
import { PosReceiptPreview } from "./PosReceiptPreview"
import { SplitTableDialog, MergeTableDialog } from "@/components/features/tables/TableTransferDialogs"

import { usePosCheckoutFlow } from "./hooks/usePosCheckoutFlow"
import { usePosDialogs } from "./hooks/usePosDialogs"
import { usePosPrinting } from "./hooks/usePosPrinting"

export function POSInterface() {
  const searchParams = useSearchParams()
  const byIdParam = searchParams.get("tableId") || ""
  const tableNumberParam = searchParams.get("tableNumber") || ""

  const { toast } = useToast()

  // 桌台列表（来自 API），失败时回退到 mock
  const {
    tables,
    loading: loadingTables,
    error: loadError,
    reload: reloadTables,
  } = useRestaurantTables({ fallback: mockTables })

  const [selectedTable, setSelectedTable] = useState<string>("")
  const { cart, addToCart, updateQuantity, removeFromCart, clearCart } = usePosCart()

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
  } = useCheckoutState({ batches, cart })

  // 菜单与分类（仅来自 API，不再使用 mock 回退）
  const { items: menuItems, categories: menuCategories } = useMenuData()

  // 使用新的 hooks
  const {
    handleCheckout,
    handleAA,
    handleOpenCheckout,
    isCheckoutLoading,
    printData,
    isPrinting,
    setPrintData,
    setIsPrinting,
  } = usePosCheckoutFlow({
    selectedTable,
    cart,
    batches,
    currentOrder,
    tables,
    tableNumberParam,
    checkoutState: checkoutState,
    checkoutActions,
    aggregatedItems,
    checkoutSubtotal,
    checkoutDiscountAmount,
    checkoutTotal,
    clearCart,
    reloadTables,
    applyOrderState,
    setOrderError,
  })

  const {
    splitDialogOpen,
    setSplitDialogOpen,
    openSplitDialog,
    mergeDialogOpen,
    setMergeDialogOpen,
    openMergeDialog,
  } = usePosDialogs({
    selectedTable,
    loadingOrder,
    batches,
  })

  // 打印逻辑
  const handlePrintComplete = useCallback(() => {
    setIsPrinting(false)
  }, [setIsPrinting])

  usePosPrinting({
    printData,
    isPrinting,
    onPrintComplete: handlePrintComplete,
  })

  // 基于 URL 参数在表加载后设定初始选中项
  useEffect(() => {
    // 优先 tableId
    if (byIdParam) {
      setSelectedTable(byIdParam)
      return
    }
    // 其次 tableNumber
    if (tableNumberParam && tables.length > 0) {
      const found = tables.find((t) => t.number === tableNumberParam)
      if (found) {
        setSelectedTable(found.id)
      }
    }
  }, [byIdParam, tableNumberParam, tables])

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

  const handleClearOrder = async () => {
    const cleared = await clearOrder()
    if (cleared) {
      clearCart()
      checkoutActions.resetCheckout()
    }
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
      existing ? existing.quantity : 1
    )
  }

  return (
    <>
      <div className="h-[calc(100vh-8rem)] flex gap-4 print:hidden">
        {/* 左列 */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* 左列顶部 - PosHeader variant="menu" */}
          <PosHeader
            variant="menu"
            tables={tables}
            loadingTables={loadingTables}
            loadError={loadError}
            selectedTable={selectedTable}
            onSelectedTableChange={setSelectedTable}
            tableNumberParam={tableNumberParam}
          />
          {/* 主内容 */}
          <PosContent
            menuCategories={menuCategories}
            menuItems={menuItems}
            onAddToCart={addToCart}
          />
        </div>

        {/* 右侧 - 订单面板 */}
        <PosOrderPanel
          tables={tables}
          loadingTables={loadingTables}
          loadError={loadError}
          selectedTable={selectedTable}
          onSelectedTableChange={setSelectedTable}
          tableNumberParam={tableNumberParam}
          batches={batches}
          cart={cart}
          loadingOrder={loadingOrder}
          orderError={orderError}
          totalItemsCount={totalItemsCount}
          onDecreasePersistedItem={decreasePersistedItem}
          onRemovePersistedItem={removePersistedItem}
          onUpdateCartQuantity={updateQuantity}
          onRemoveFromCart={removeFromCart}
          subtotal={subtotal}
          discountPercent={discountPercent}
          discountAmount={discountAmount}
          total={total}
          onSubmitBatch={handleSubmitBatch}
          onOpenCheckout={handleOpenCheckout}
          onClearOrder={handleClearOrder}
          onAA={handleAA}
          onOpenSplit={openSplitDialog}
          onOpenMerge={openMergeDialog}
          submittingBatch={submittingBatch}
          clearingOrder={clearingOrder}
          maxExistingBatchNo={maxExistingBatchNo}
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
          checkoutLoading={isCheckoutLoading}
          onCheckout={handleCheckout}
        />

        <SplitTableDialog
          open={splitDialogOpen}
          onOpenChange={setSplitDialogOpen}
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
          open={mergeDialogOpen}
          onOpenChange={setMergeDialogOpen}
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
