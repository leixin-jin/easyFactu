"use client"

import { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Receipt,
  Printer,
  Copy,
  Split,
  ArrowLeft,
  DivideCircle,
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useMenuData } from "@/hooks/useMenuData"
import { useToast } from "@/hooks/use-toast"

interface MenuItem {
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

interface CartItem extends MenuItem {
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

interface OrderBatchView {
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

type TableStatus = "idle" | "occupied"
interface TableOption {
  id: string
  number: string
  status?: TableStatus
}

// 仅用于接口失败时的降级回退
const mockTables: TableOption[] = [
  { id: "1", number: "A-01", status: "occupied" },
  { id: "2", number: "A-02", status: "idle" },
  { id: "3", number: "A-03", status: "occupied" },
  { id: "4", number: "B-01", status: "occupied" },
  { id: "5", number: "B-02", status: "idle" },
]

export function POSInterface() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const byIdParam = searchParams.get("tableId") || ""
  const tableNumberParam = searchParams.get("tableNumber") || ""

  // 桌台列表（来自 API），失败时回退到 mock
  const [tables, setTables] = useState<TableOption[]>([])
  const [loadingTables, setLoadingTables] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

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

  // 加载桌台列表
  async function loadTables() {
    try {
      setLoadingTables(true)
      setLoadError(null)
      const res = await fetch("/api/restaurant-tables", { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: Array<{ id: string; number: string; status?: string | null }> = await res.json()
      const mapped: TableOption[] = data.map((r) => ({
        id: String(r.id),
        number: r.number,
        status: (r.status as TableStatus) ?? "idle",
      }))
      mapped.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true, sensitivity: "base" }))
      setTables(mapped)
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "加载失败")
      setTables(mockTables)
    } finally {
      setLoadingTables(false)
    }
  }

  useEffect(() => {
    loadTables()
  }, [])

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
            price: item.price,
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

      // 如有未提交的草稿批次，先自动提交
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
              price: item.price,
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
        const message =
          (checkoutData && (checkoutData.error as string)) || `结账失败 (${checkoutRes.status})`
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
      await loadTables()

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
      {/* Left side - Menu */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground text-balance">点单系统</h1>
            <p className="text-muted-foreground mt-1">
              {selectedTable
                ? `当前桌台: ${tables.find((t) => t.id === selectedTable)?.number || "未知"}`
                : tableNumberParam
                ? `当前桌台: ${tableNumberParam}`
                : "选择菜品并添加到订单"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/tables">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" /> 返回桌台
              </Button>
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索菜品..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Categories */}
        <Tabs
          value={selectedCategory}
          onValueChange={setSelectedCategory}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="w-full justify-start overflow-x-auto">
            {menuCategories.map((category) => (
              <TabsTrigger key={category.id} value={category.id} className="flex-shrink-0">
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedCategory} className="flex-1 mt-4 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
                {filteredItems.map((item) => (
                  <Card
                    key={item.id}
                    className="overflow-hidden cursor-pointer hover:border-primary transition-colors group"
                    onClick={() => addToCart(item)}
                  >
                    <div className="aspect-square relative overflow-hidden bg-muted">
                      <img
                        src={item.image || "/placeholder.svg"}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      {item.popular && (
                        <Badge className="absolute top-2 right-2 bg-destructive text-destructive-foreground">
                          热销
                        </Badge>
                      )}
                      {item.spicy && (
                        <Badge className="absolute top-2 left-2 bg-destructive/80 text-destructive-foreground">
                          {"🌶️".repeat(item.spicy)}
                        </Badge>
                      )}
                    </div>
                    <div className="p-3 space-y-1">
                      <h3 className="font-medium text-foreground text-sm leading-tight">{item.name}</h3>
                      <p className="text-xs text-muted-foreground">{item.nameEn}</p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-lg font-bold text-primary">€{item.price.toFixed(2)}</span>
                        <Button
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation()
                            addToCart(item)
                          }}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Right side - Cart */}
      <Card className="w-96 h-full flex flex-col bg-card border-border">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">当前订单</h2>
            </div>
            <Badge variant="secondary">{totalItemsCount} 项</Badge>
          </div>

          {/* 选择桌台（来自 Supabase 数据）*/}
          <Select value={selectedTable} onValueChange={setSelectedTable}>
            <SelectTrigger>
              <SelectValue placeholder="选择桌台" />
            </SelectTrigger>
            <SelectContent>
              {tables.map((table) => (
                <SelectItem key={table.id} value={table.id}>
                  {table.number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {loadingTables && (
            <p className="mt-2 text-xs text-muted-foreground">正在加载桌台列表...</p>
          )}
          {loadError && !loadingTables && (
            <p className="mt-2 text-xs text-destructive">
              加载桌台失败，已使用本地默认桌台列表。
            </p>
          )}
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
              <p className="text-sm text-muted-foreground mt-1">在左侧选择菜品并点击“下单”提交</p>
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
                                  onClick={() => handleRemovePersistedItem(item.id)}
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
                                    onClick={() => handleDecreasePersistedItem(item.id)}
                                  >
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                  <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
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
                                onClick={() => removeFromCart(item.id)}
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
                                  onClick={() => updateQuantity(item.id, -1)}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7 bg-transparent"
                                  onClick={() => updateQuantity(item.id, 1)}
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
            {discount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">折扣 ({discount}%)</span>
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
              onClick={handleSubmitBatch}
              disabled={submittingBatch || !selectedTable || cart.length === 0}
            >
              <Plus className="w-4 h-4" />
              下单
            </Button>
            <Button
              className="gap-2 bg-yellow-500 text-black hover:bg-yellow-600 disabled:!bg-yellow-500 disabled:!text-black disabled:!opacity-100 disabled:cursor-not-allowed"
              onClick={handleOpenCheckout}
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
              onClick={handleClearOrder}
              disabled={clearingOrder || (cart.length === 0 && batches.length === 0)}
            >
              <Trash2 className="w-4 h-4" />
              清空
            </Button>
            <Button
              className="gap-2 bg-pink-500 text-white hover:bg-pink-600 disabled:opacity-50"
              onClick={handleAA}
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
              onClick={() => setSplitTableDialog(true)}
            >
              <Split className="w-3 h-3" />
              <span className="hidden sm:inline">拆台</span>
            </Button>
            <Button
              variant="outline"
              className="gap-1 text-xs bg-transparent"
              onClick={() => setMergeTableDialog(true)}
            >
              <Copy className="w-3 h-3" />
              <span className="hidden sm:inline">并台</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Checkout Dialog */}
      <Dialog
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
      >
        {/* 固定高度的三栏结账页面：宽度约为视口 80%，高度不超过视口高度 */}
        <DialogContent className="w-[80vw] max-w-[80vw] sm:max-w-[80vw] max-h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>订单结账</DialogTitle>
            <DialogDescription>
              桌台: {tables.find((t) => t.id === selectedTable)?.number || tableNumberParam}
            </DialogDescription>
          </DialogHeader>

          {/* 三栏布局：左订单明细 / 中间汇总+AA预留 / 右侧结账方式 */}
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3 flex-1 min-h-0 overflow-hidden">
            {/* 左侧：订单明细（绿色区域，可滚动） */}
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

            {/* 中间：订单总结 + AA 区域（上下各占 50%） */}
            <Card className="h-full min-h-0 grid grid-rows-2">
              {/* 上：订单总结（菜品 x 数量，可滚动） */}
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
                        onClick={() => handleAggregatedItemClick(item)}
                      >
                        <span className="truncate max-w-[10rem] sm:max-w-[12rem] text-foreground">
                          {item.name}
                        </span>
                        <span className="text-muted-foreground">x{item.quantity}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* 下：AA 分单区域 */}
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
                      onClick={() => setAaItems([])}
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
                                setAaQuantityTarget({
                                  itemId: item.id,
                                  name: item.name,
                                  maxQuantity:
                                    aggregatedItems.find((agg) => agg.id === item.id)?.quantity ??
                                    item.quantity,
                                  price: item.price,
                                })
                                setAaQuantityInput(item.quantity)
                                setAaQuantityDialogOpen(true)
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
                            setAaItems((prev) => prev.filter((aa) => aa.id !== item.id))
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
                  {/* 仅保留现金与刷卡两种方式 */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <Button
                      type="button"
                      variant={paymentMethod === "cash" ? "default" : "outline"}
                      className="w-full"
                      onClick={() => setPaymentMethod("cash")}
                    >
                      现金
                    </Button>
                    <Button
                      type="button"
                      variant={paymentMethod === "card" ? "default" : "outline"}
                      className="w-full"
                      onClick={() => setPaymentMethod("card")}
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
                      if (Number.isNaN(value) || value < 0) {
                        setReceivedAmount(0)
                      } else {
                        setReceivedAmount(value)
                      }
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
                        setDiscount(Math.min(100, Math.max(0, Number(e.target.value) || 0)))
                      }
                      className="flex-1"
                      placeholder="请输入折扣"
                    />
                    <Button type="button" variant="outline" onClick={() => setDiscount(10)}>
                      10%
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setDiscount(20)}>
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
                  onClick={() => setCheckoutDialog(false)}
                  disabled={checkoutLoading}
                >
                  取消
                </Button>
                <Button
                  onClick={handleCheckout}
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
      </Dialog>

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
                {mockTables
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
                {mockTables
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background text-foreground p-4 print:bg-white print:text-black">
        <Card className="w-full max-w-sm border-border shadow-lg print:shadow-none print:border-0">
          <div className="p-4 space-y-2">
            <div className="text-center">
              <h2 className="text-xl font-bold">
                {printData.mode === "aa" ? "AA 分单小票" : "结账小票"}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                桌台 {printData.tableNumber} · 订单号 {printData.orderId}
              </p>
            </div>
            <Separator />
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>时间</span>
                <span>{printData.paidAt}</span>
              </div>
              <div className="flex justify-between">
                <span>支付方式</span>
                <span>{printData.paymentMethod === "card" ? "刷卡" : "现金"}</span>
              </div>
            </div>
            <Separator />
            <div className="max-h-60 overflow-y-auto">
              {printData.items.map((item) => (
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
                <span>€{printData.subtotal.toFixed(2)}</span>
              </div>
              {printData.discountPercent > 0 && (
                <div className="flex justify-between text-xs">
                  <span>折扣 ({printData.discountPercent}%)</span>
                  <span>-€{printData.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold">
                <span>应付金额</span>
                <span>€{printData.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>实收</span>
                <span>€{printData.receivedAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>找零</span>
                <span>€{printData.changeAmount.toFixed(2)}</span>
              </div>
            </div>
            <div className="pt-2 flex justify-center gap-2 print:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPrintData(null)
                  setIsPrinting(false)
                }}
              >
                返回 POS
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.print()
                  }
                }}
              >
                重新打印
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )}
    </>
  )
}
