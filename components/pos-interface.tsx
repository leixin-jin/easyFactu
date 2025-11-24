"use client"

import { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useRouter, useSearchParams } from "next/navigation"
import { useMenuData } from "@/hooks/useMenuData"
import { useToast } from "@/hooks/use-toast"
import {
  type RestaurantTableView as TableOption,
  useRestaurantTables,
} from "@/hooks/useRestaurantTables"
import { PosMenuPane } from "@/components/PosMenuPane"
import { PosOrderSidebar } from "@/components/PosOrderSidebar"
import { PosCheckoutDialog } from "@/components/PosCheckoutDialog"

export interface MenuItem {
  id: string
  name: string
  nameEn: string
  category: string
  price: number
  image: string
  available: boolean
  popular?: boolean
  spicy?: number
}

export interface CartItem extends MenuItem {
  quantity: number
  notes?: string
}

interface OrderItemView {
  id: string
  menuItemId: string
  name: string
  nameEn: string
  price: number
  quantity: number
  notes: string | null
  createdAt: string
}

export interface OrderBatchView {
  batchNo: number
  items: OrderItemView[]
}

interface CurrentOrderSummary {
  id: string
  tableId: string | null
  status: string
  subtotal: number
  discount: number
  total: number
  totalAmount?: number
  paidAmount?: number
  paymentMethod: string | null
  createdAt: string
  closedAt: string | null
}

interface AAItemSelection {
  id: string
  name: string
  price: number
  quantity: number
}

interface ReceiptItem {
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface CheckoutReceiptData {
  mode: "full" | "aa"
  orderId: string
  tableNumber: string
  paidAt: string
  paymentMethod: string
  subtotal: number
  discountPercent: number
  discountAmount: number
  total: number
  receivedAmount: number
  changeAmount: number
  items: ReceiptItem[]
}

// 分类改为从 /api/menu-items 获取（通过 useMenuData），已移除菜单 mock

// 仅用于接口失败时的降级回退
const mockTables: TableOption[] = [
  { id: "1", number: "A-01", status: "occupied" },
  { id: "2", number: "A-02", status: "idle" },
  { id: "3", number: "A-03", status: "occupied" },
  { id: "4", number: "B-01", status: "occupied" },
  { id: "5", number: "B-02", status: "idle" },
]

const errorCodeToMessage: Record<string, string> = {
  SUBTOTAL_MISMATCH: "订单金额已在其他终端更新，请刷新后按最新金额重新结账。",
  TOTAL_MISMATCH: "订单金额已在其他终端更新，请刷新后按最新金额重新结账。",
  AA_QUANTITY_EXCEEDS_ORDER: "AA 份数超过订单中可分配的数量，请检查选择。",
  AA_QUANTITY_CONFLICT: "AA 结账时菜品数量发生冲突，请刷新后重试。",
  AA_ITEMS_REQUIRED: "AA 结账至少需要选择一项菜品。",
  INSUFFICIENT_RECEIVED_AMOUNT: "收款金额不足，请确认实收金额大于等于应付金额。",
  ITEM_FULLY_PAID: "该菜品已全部结清，无法再次修改或 AA。",
  DECREMENT_BELOW_PAID_QUANTITY: "不能将数量减到已支付份数以下。",
  REMOVE_PAID_ITEM_FORBIDDEN: "已支付或部分支付的菜品不能被移除。",
  ORDER_NOT_OPEN: "订单已不在进行中状态，无法结账。",
  ORDER_EMPTY: "当前订单没有任何菜品，无法结账。",
  TABLE_NOT_FOUND: "未找到对应桌台，请刷新页面后重试。",
  ORDER_NOT_FOUND: "未找到对应订单，请刷新页面后重试。",
  OPEN_ORDER_ALREADY_EXISTS: "该桌台已存在进行中的订单，请刷新后重试。",
}

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
  // 当前待提交批次（未落库）
  const [cart, setCart] = useState<CartItem[]>([])
  // 当前选中桌台及其订单
  const [selectedTable, setSelectedTable] = useState<string>("")
  const [currentOrder, setCurrentOrder] = useState<CurrentOrderSummary | null>(null)
  const [batches, setBatches] = useState<OrderBatchView[]>([])
  const [loadingOrder, setLoadingOrder] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)
  const [submittingBatch, setSubmittingBatch] = useState(false)
  const [clearingOrder, setClearingOrder] = useState(false)

  const [checkoutDialog, setCheckoutDialog] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [discount, setDiscount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [splitTableDialog, setSplitTableDialog] = useState(false)
  const [mergeTableDialog, setMergeTableDialog] = useState(false)
  const [receivedAmount, setReceivedAmount] = useState(0)
  const [aaMode, setAaMode] = useState(false)
  const [aaItems, setAaItems] = useState<AAItemSelection[]>([])
  const [aaQuantityDialogOpen, setAaQuantityDialogOpen] = useState(false)
  const [aaQuantityTarget, setAaQuantityTarget] = useState<{
    itemId: string
    name: string
    maxQuantity: number
    price: number
  } | null>(null)
  const [aaQuantityInput, setAaQuantityInput] = useState(1)
  const [, setOperationStatus] = useState<"closed" | "open" | "pending">("closed")
  const [printData, setPrintData] = useState<CheckoutReceiptData | null>(null)
  const [isPrinting, setIsPrinting] = useState(false)

  const { toast } = useToast()

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

  // 加载指定桌台当前开放订单及批次
  async function loadOrderForTable(tableId: string) {
    if (!tableId) {
      setCurrentOrder(null)
      setBatches([])
      setOrderError(null)
      return
    }
    try {
      setLoadingOrder(true)
      setOrderError(null)
      const res = await fetch(`/api/orders?tableId=${encodeURIComponent(tableId)}`, { cache: "no-store" })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const message = (data && (data.error as string)) || `加载订单失败 (${res.status})`
        throw new Error(message)
      }
      setCurrentOrder(data.order ?? null)
      setBatches(data.batches ?? [])
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "加载订单失败"
      setCurrentOrder(null)
      setBatches([])
      setOrderError(message)
      toast({
        title: "加载订单失败",
        description: message,
        variant: "destructive",
      })
    } finally {
      setLoadingOrder(false)
    }
  }

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

  // 当选中桌台变更时加载该桌台的当前订单
  useEffect(() => {
    if (!selectedTable) {
      setCurrentOrder(null)
      setBatches([])
      setOrderError(null)
      return
    }
    loadOrderForTable(selectedTable)
  }, [selectedTable])

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nameEn.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch && item.available
  })

  const addToCart = (item: MenuItem) => {
    const existingItem = cart.find((cartItem) => cartItem.id === item.id)
    if (existingItem) {
      setCart(
        cart.map((cartItem) => (cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem)),
      )
    } else {
      setCart([...cart, { ...item, quantity: 1 }])
    }
  }

  const updateQuantity = (id: string, change: number) => {
    setCart(
      cart
        .map((item) => (item.id === id ? { ...item, quantity: Math.max(0, item.quantity + change) } : item))
        .filter((item) => item.quantity > 0),
    )
  }

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id))
  }

  const existingSubtotal = useMemo(
    () =>
      batches.reduce(
        (batchSum, batch) =>
          batchSum +
          batch.items.reduce((itemSum, item) => itemSum + item.price * item.quantity, 0),
        0,
      ),
    [batches],
  )

  const draftSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const subtotal = existingSubtotal + draftSubtotal
  const discountAmount = (subtotal * discount) / 100
  const total = subtotal - discountAmount

  // 订单汇总：用于“菜品 × 数量”显示（结账中间区域）
  const aggregatedItems = useMemo(() => {
    const map = new Map<string, { id: string; name: string; quantity: number; price: number }>()

    const addItem = (id: string, name: string, quantity: number, price: number) => {
      if (!id) return
      const existing = map.get(id)
      if (existing) {
        existing.quantity += quantity
      } else {
        map.set(id, { id, name, quantity, price })
      }
    }

    batches.forEach((batch) => {
      batch.items.forEach((item) => {
        addItem(item.menuItemId, item.name, item.quantity, item.price)
      })
    })

    cart.forEach((item) => {
      addItem(item.id, item.name, item.quantity, item.price)
    })

    return Array.from(map.values())
  }, [batches, cart])

  const totalItemsCount =
    batches.reduce(
      (batchSum, batch) =>
        batchSum + batch.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0,
    ) + cart.reduce((sum, item) => sum + item.quantity, 0)

  const maxExistingBatchNo = batches.length > 0 ? Math.max(...batches.map((b) => b.batchNo)) : 0

  const aaSubtotal = useMemo(
    () => aaItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [aaItems],
  )

  // 结账弹窗右侧金额：AA 模式下只按 AA 分单计算；普通模式下使用整单金额
  const checkoutSubtotal = aaMode ? aaSubtotal : subtotal
  const checkoutDiscountAmount = (checkoutSubtotal * discount) / 100
  const checkoutTotal = checkoutSubtotal - checkoutDiscountAmount
  const changeAmount = receivedAmount > 0 ? receivedAmount - checkoutTotal : 0

  async function updatePersistedItem(itemId: string, type: "decrement" | "remove") {
    if (!selectedTable) {
      toast({
        title: "请先选择桌台",
        description: "请选择右侧的桌台后再进行减菜操作。",
        variant: "destructive",
      })
      return
    }
    try {
      setLoadingOrder(true)
      setOrderError(null)
      const res = await fetch(`/api/orders/${encodeURIComponent(itemId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const message = (data && (data.error as string)) || `更新订单失败 (${res.status})`
        throw new Error(message)
      }
      setCurrentOrder(data.order ?? null)
      setBatches(data.batches ?? [])
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "更新订单失败"
      setOrderError(message)
      toast({
        title: "更新订单失败",
        description: message,
        variant: "destructive",
      })
    } finally {
      setLoadingOrder(false)
    }
  }

  const handleDecreasePersistedItem = (itemId: string) => {
    updatePersistedItem(itemId, "decrement")
  }

  const handleRemovePersistedItem = (itemId: string) => {
    updatePersistedItem(itemId, "remove")
  }

  const handleSubmitBatch = async () => {
    if (!selectedTable) {
      toast({
        title: "未选择桌台",
        description: "请先在右侧选择一个桌台，再提交下单。",
        variant: "destructive",
      })
      return
    }
    if (cart.length === 0) {
      toast({
        title: "当前批次为空",
        description: "请先在左侧选择菜品添加到当前批次。",
      })
      return
    }
    try {
      setSubmittingBatch(true)
      setOrderError(null)
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: selectedTable,
          paymentMethod,
          items: cart.map((item) => ({
            menuItemId: item.id,
            quantity: item.quantity,
            notes: item.notes ?? undefined,
          })),
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const message = (data && (data.error as string)) || `下单失败 (${res.status})`
        throw new Error(message)
      }
      setCurrentOrder(data.order ?? null)
      setBatches(data.batches ?? [])
      setCart([])
      toast({
        title: "下单成功",
        description: "当前批次已成功提交到订单。",
      })
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "下单失败"
      setOrderError(message)
      toast({
        title: "下单失败",
        description: message,
        variant: "destructive",
      })
    } finally {
      setSubmittingBatch(false)
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

    if (aaMode && aaItems.length === 0) {
      toast({
        title: "未选择 AA 菜品",
        description: "请在中间的订单总结区域点击菜品，选择要 AA 结账的内容。",
        variant: "destructive",
      })
      return
    }

    if (!currentOrder && cart.length === 0) {
      toast({
        title: "当前订单为空",
        description: "请先添加菜品并下单后再进行结账。",
        variant: "destructive",
      })
      return
    }

    const checkoutSubtotalValue = checkoutSubtotal
    const checkoutDiscountAmountValue = checkoutDiscountAmount
    const checkoutTotalValue = checkoutTotal

    const effectiveReceived =
      receivedAmount != null && receivedAmount > 0
        ? receivedAmount
        : checkoutTotalValue

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

      let orderId = currentOrder?.id ?? null

      // 如有未提交的草稿批次，先自动提交（当前通过入口约束，正常情况下 cart 已为空）
      if (cart.length > 0) {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tableId: selectedTable,
            paymentMethod,
            items: cart.map((item) => ({
              menuItemId: item.id,
              quantity: item.quantity,
              notes: item.notes ?? undefined,
            })),
          }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          const message = (data && (data.error as string)) || `下单失败 (${res.status})`
          throw new Error(message)
        }
        setCurrentOrder(data.order ?? null)
        setBatches(data.batches ?? [])
        setCart([])
        orderId = data.order?.id ?? orderId
      }

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
          discountPercent: discount,
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
        const mapped = code && errorCodeToMessage[code]
        const message =
          mapped ||
          rawMessage ||
          (code ? `结账失败（错误码：${code}）` : `结账失败 (${checkoutRes.status})`)

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
        setCurrentOrder(checkoutData.order ?? null)
        setBatches(checkoutData.batches ?? [])
      } else {
        setCurrentOrder(null)
        setBatches([])
      }

      // 结账成功：关闭弹窗并清理本次结账状态
      setCheckoutDialog(false)
      setAaMode(false)
      setAaItems([])
      setAaQuantityDialogOpen(false)
      setAaQuantityTarget(null)
      setAaQuantityInput(1)
      setReceivedAmount(0)
      setDiscount(0)

      // 刷新桌台列表，确保状态变为 idle
      await reloadTables()

      setPrintData({
        mode,
        orderId,
        tableNumber,
        paidAt: new Date().toLocaleString(),
        paymentMethod,
        subtotal: checkoutSubtotalValue,
        discountPercent: discount,
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
    if (!selectedTable) {
      // 仅清空本地草稿视图
      setCart([])
      setBatches([])
      setCurrentOrder(null)
      setOrderError(null)
      return
    }
    try {
      setClearingOrder(true)
      setOrderError(null)
      const res = await fetch("/api/orders/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId: selectedTable }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const message = (data && (data.error as string)) || `清空订单失败 (${res.status})`
        throw new Error(message)
      }
      setCurrentOrder(data.order ?? null)
      setBatches(data.batches ?? [])
      setCart([])
      toast({
        title: "订单已清空",
        description: "当前桌台的订单已全部清空。",
      })
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "清空订单失败"
      setOrderError(message)
      toast({
        title: "清空订单失败",
        description: message,
        variant: "destructive",
      })
    } finally {
      setClearingOrder(false)
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
    setReceivedAmount(0)
    setAaMode(true)
    setAaItems([])
    setAaQuantityDialogOpen(false)
    setAaQuantityTarget(null)
    setAaQuantityInput(1)
    setCheckoutDialog(true)
  }

  const handleOpenCheckout = () => {
    if (!selectedTable) {
      return
    }
    setReceivedAmount(0)
    setAaMode(false)
    setAaItems([])
    setAaQuantityDialogOpen(false)
    setAaQuantityTarget(null)
    setAaQuantityInput(1)
    setCheckoutDialog(true)
  }

  const handleAggregatedItemClick = (item: {
    id: string
    name: string
    quantity: number
    price: number
  }) => {
    if (!aaMode) {
      return
    }

    if (item.quantity <= 1) {
      setAaItems((prev) => {
        const existing = prev.find((aa) => aa.id === item.id)
        if (existing) {
          return prev.filter((aa) => aa.id !== item.id)
        }
        return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1 }]
      })
      return
    }

    const existing = aaItems.find((aa) => aa.id === item.id)
    setAaQuantityTarget({
      itemId: item.id,
      name: item.name,
      maxQuantity: item.quantity,
      price: item.price,
    })
    setAaQuantityInput(existing ? existing.quantity : 1)
    setAaQuantityDialogOpen(true)
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
        discount={discount}
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
        onOpenSplit={() => setSplitTableDialog(true)}
        onOpenMerge={() => setMergeTableDialog(true)}
      />

      <PosCheckoutDialog
        open={checkoutDialog}
        onOpenChange={(open) => {
          setCheckoutDialog(open)
          if (!open) {
            setReceivedAmount(0)
            setAaMode(false)
            setAaItems([])
            setAaQuantityDialogOpen(false)
            setAaQuantityTarget(null)
            setAaQuantityInput(1)
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
        onClearAAItems={() => setAaItems([])}
        onAggregatedItemClick={handleAggregatedItemClick}
        aaQuantityDialogOpen={aaQuantityDialogOpen}
        aaQuantityTarget={aaQuantityTarget}
        aaQuantityInput={aaQuantityInput}
        onAaQuantityInputChange={setAaQuantityInput}
        onConfirmAaQuantity={() => {
          if (!aaQuantityTarget) return
          const quantity = Math.min(
            aaQuantityTarget.maxQuantity,
            Math.max(1, aaQuantityInput || 1),
          )
          setAaItems((prev) => {
            const existing = prev.find((aa) => aa.id === aaQuantityTarget.itemId)
            const rest = prev.filter((aa) => aa.id !== aaQuantityTarget.itemId)
            if (existing) {
              return [...rest, { ...existing, quantity }]
            }
            return [...rest, { id: aaQuantityTarget.itemId, name: aaQuantityTarget.name, price: aaQuantityTarget.price, quantity }]
          })
          setAaQuantityDialogOpen(false)
          setAaQuantityTarget(null)
          setAaQuantityInput(1)
        }}
        onCancelAaQuantity={() => {
          setAaQuantityDialogOpen(false)
          setAaQuantityTarget(null)
          setAaQuantityInput(1)
        }}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        receivedAmount={receivedAmount}
        onReceivedAmountChange={setReceivedAmount}
        changeAmount={changeAmount}
        discount={discount}
        onDiscountChange={setDiscount}
        checkoutSubtotal={checkoutSubtotal}
        checkoutDiscountAmount={checkoutDiscountAmount}
        checkoutTotal={checkoutTotal}
        currentOrderPaidAmount={currentOrder?.paidAmount ?? 0}
        checkoutLoading={checkoutLoading}
        onCheckout={handleCheckout}
      />

      {/* removed: Hold Order Dialog */}

      {/* AA 数量选择弹窗 */}
      <Dialog open={aaQuantityDialogOpen} onOpenChange={setAaQuantityDialogOpen}>
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
                if (!aaQuantityTarget) return
                const clamped = Math.min(
                  aaQuantityTarget.maxQuantity,
                  Math.max(1, raw),
                )
                setAaQuantityInput(clamped)
              }}
            />
            <p className="text-xs text-muted-foreground">
              不能超过该菜品在订单中的总数量。
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAaQuantityDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              onClick={() => {
                if (!aaQuantityTarget) return
                const quantity = Math.min(
                  aaQuantityTarget.maxQuantity,
                  Math.max(1, aaQuantityInput),
                )
                setAaItems((prev) => {
                  const existing = prev.find(
                    (item) => item.id === aaQuantityTarget.itemId,
                  )
                  if (existing) {
                    return prev.map((item) =>
                      item.id === aaQuantityTarget.itemId
                        ? { ...item, quantity }
                        : item,
                    )
                  }
                  return [
                    ...prev,
                    {
                      id: aaQuantityTarget.itemId,
                      name: aaQuantityTarget.name,
                      price: aaQuantityTarget.price,
                      quantity,
                    },
                  ]
                })
                setAaQuantityDialogOpen(false)
              }}
            >
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Split Table Dialog */}
      <Dialog open={splitTableDialog} onOpenChange={setSplitTableDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>拆台</DialogTitle>
            <DialogDescription>选择要拆分的菜品到新桌台</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">选择目标桌台将菜品分配至新桌</p>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="选择目标桌台" />
              </SelectTrigger>
              <SelectContent>
                {tables
                  .filter((t) => t.id !== selectedTable)
                  .map((table) => (
                    <SelectItem key={table.id} value={table.id}>
                      {table.number}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSplitTableDialog(false)}>
              取消
            </Button>
            <Button onClick={() => setSplitTableDialog(false)}>确认拆台</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Table Dialog */}
      <Dialog open={mergeTableDialog} onOpenChange={setMergeTableDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>并台</DialogTitle>
            <DialogDescription>选择主桌与目标桌预览账单合并</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">选择要并入的桌台，账单将合并</p>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="选择目标桌台" />
              </SelectTrigger>
              <SelectContent>
                {tables
                  .filter((t) => t.id !== selectedTable)
                  .map((table) => (
                    <SelectItem key={table.id} value={table.id}>
                      {table.number}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeTableDialog(false)}>
              取消
            </Button>
            <Button onClick={() => setMergeTableDialog(false)}>确认并台</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

interface PosReceiptPreviewProps {
  data: CheckoutReceiptData
  onClose: () => void
  onPrint: () => void
}

function PosReceiptPreview({ data, onClose, onPrint }: PosReceiptPreviewProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background text-foreground p-4 print:bg-white print:text-black">
      <Card className="w-full max-w-sm border-border shadow-lg print:shadow-none print:border-0">
        <div className="p-4 space-y-2">
          <div className="text-center">
            <h2 className="text-xl font-bold">
              {data.mode === "aa" ? "AA 分单小票" : "结账小票"}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              桌台 {data.tableNumber} · 订单号 {data.orderId}
            </p>
          </div>
          <Separator />
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>时间</span>
              <span>{data.paidAt}</span>
            </div>
            <div className="flex justify-between">
              <span>支付方式</span>
              <span>{data.paymentMethod === "card" ? "刷卡" : "现金"}</span>
            </div>
          </div>
          <Separator />
          <div className="max-h-60 overflow-y-auto">
            {data.items.map((item) => (
              <div key={item.name} className="flex justify-between text-xs py-1">
                <div className="flex-1 pr-2">
                  <div className="flex justify-between">
                    <span className="truncate max-w-[8rem]">{item.name}</span>
                    <span>x{item.quantity}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    单价 €{item.unitPrice.toFixed(2)}
                  </div>
                </div>
                <div className="text-right text-xs font-medium">
                  €{item.totalPrice.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
          <Separator />
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>小计</span>
              <span>€{data.subtotal.toFixed(2)}</span>
            </div>
            {data.discountPercent > 0 && (
              <div className="flex justify-between text-xs">
                <span>折扣 ({data.discountPercent}%)</span>
                <span>-€{data.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold">
              <span>应付金额</span>
              <span>€{data.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>实收</span>
              <span>€{data.receivedAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>找零</span>
              <span>€{data.changeAmount.toFixed(2)}</span>
            </div>
          </div>
          <div className="pt-2 flex justify-center gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={onClose}>
              返回 POS
            </Button>
            <Button size="sm" onClick={onPrint}>
              重新打印
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
