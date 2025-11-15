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
import { Search, Plus, Minus, Trash2, ShoppingCart, Receipt, Printer, Copy, Split, ArrowLeft } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useSearchParams } from "next/navigation"
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
  const [discount, setDiscount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [splitTableDialog, setSplitTableDialog] = useState(false)
  const [mergeTableDialog, setMergeTableDialog] = useState(false)
  const [, setOperationStatus] = useState<"closed" | "open" | "pending">("closed")

  const { toast } = useToast()

  // 菜单与分类（仅来自 API，不再使用 mock 回退）
  const {
    items: menuItems,
    categories: menuCategories,
    loading: loadingMenu,
    error: menuError,
  } = useMenuData()

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

  const totalItemsCount =
    batches.reduce(
      (batchSum, batch) =>
        batchSum + batch.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0,
    ) + cart.reduce((sum, item) => sum + item.quantity, 0)

  const maxExistingBatchNo = batches.length > 0 ? Math.max(...batches.map((b) => b.batchNo)) : 0

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

  const handleCheckout = () => {
    console.log("[v0] Processing checkout:", {
      cart,
      selectedTable,
      total,
      paymentMethod,
      currentOrder,
      batches,
    })
    setCheckoutDialog(false)
    setCart([])
    setSelectedTable("")
    setDiscount(0)
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

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4">
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
              onClick={() => setCheckoutDialog(true)}
              disabled={!selectedTable}
            >
              <Receipt className="w-4 h-4" />
              结账
            </Button>
          </div>

          {/* 第二排：拆台 + 并台；第三排：清空 */}
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
            <Button
              variant="destructive"
              className="gap-2"
              onClick={handleClearOrder}
              disabled={clearingOrder || (cart.length === 0 && batches.length === 0)}
            >
              <Trash2 className="w-4 h-4" />
              清空
            </Button>
            {/* 占位，保持网格对齐 */}
            <div></div>
          </div>
        </div>
      </Card>

      {/* Checkout Dialog */}
      <Dialog open={checkoutDialog} onOpenChange={setCheckoutDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>订单结账</DialogTitle>
            <DialogDescription>桌台: {tables.find((t) => t.id === selectedTable)?.number || tableNumberParam}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Order summary */}
            <div className="space-y-2">
              <Label>订单明细</Label>
              <Card className="p-3 bg-muted/30 border-border max-h-40 overflow-y-auto">
                <div className="space-y-2">
                  {batches.length === 0 && cart.length === 0 ? (
                    <p className="text-sm text-muted-foreground">当前订单为空</p>
                  ) : (
                    <>
                      {batches.map((batch) => (
                        <div key={batch.batchNo} className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground">
                            {batch.batchNo === 1 ? "第 1 批下单" : `第 ${batch.batchNo} 批加菜`}
                          </div>
                          {batch.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-sm">
                              <span className="text-foreground">
                                {item.name} x{item.quantity}
                              </span>
                              <span className="text-muted-foreground">
                                €{(item.price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}
                      {cart.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground">
                            第 {maxExistingBatchNo + 1} 批（未提交）
                          </div>
                          {cart.map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-sm">
                              <span className="text-foreground">
                                {item.name} x{item.quantity}
                              </span>
                              <span className="text-muted-foreground">
                                €{(item.price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </Card>
            </div>

            {/* Discount */}
            <div className="space-y-2">
              <Label htmlFor="discount">折扣 (%)</Label>
              <div className="flex gap-2">
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  max="100"
                  value={discount}
                  onChange={(e) => setDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
                  className="flex-1"
                />
                <Button variant="outline" onClick={() => setDiscount(10)}>
                  10%
                </Button>
                <Button variant="outline" onClick={() => setDiscount(20)}>
                  20%
                </Button>
              </div>
            </div>

            {/* Payment method */}
            <div className="space-y-2">
              <Label htmlFor="payment">支付方式</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="payment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">现金</SelectItem>
                  <SelectItem value="card">银行卡</SelectItem>
                  <SelectItem value="wechat">微信支付</SelectItem>
                  <SelectItem value="alipay">支付宝</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Total */}
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">小计</span>
                <span className="text-foreground">€{subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">折扣</span>
                  <span className="text-destructive">-€{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">应付金额</span>
                <span className="text-2xl font-bold text-primary">€{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCheckout} className="gap-2">
              <Printer className="w-4 h-4" />
              确认并打印
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* removed: Hold Order Dialog */}

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
  )
}
