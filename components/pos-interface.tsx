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
import { Search, Plus, Minus, Trash2, ShoppingCart, Receipt, Printer, Copy, Book as Hook, Split, ArrowLeft } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

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

const menuCategories = [
  { id: "all", name: "全部", nameEn: "All" },
  { id: "appetizers", name: "开胃菜", nameEn: "Appetizers" },
  { id: "main", name: "主菜", nameEn: "Main Courses" },
  { id: "pasta", name: "意面", nameEn: "Pasta" },
  { id: "pizza", name: "披萨", nameEn: "Pizza" },
  { id: "desserts", name: "甜品", nameEn: "Desserts" },
  { id: "drinks", name: "饮品", nameEn: "Drinks" },
]

const mockMenuItems: MenuItem[] = [
  {
    id: "1",
    name: "凯撒沙拉",
    nameEn: "Caesar Salad",
    category: "appetizers",
    price: 12.5,
    image: "/caesar-salad.png",
    available: true,
    popular: true,
  },
  {
    id: "2",
    name: "意式肉酱面",
    nameEn: "Spaghetti Bolognese",
    category: "pasta",
    price: 16.8,
    image: "/spaghetti-bolognese.png",
    available: true,
    popular: true,
  },
  {
    id: "3",
    name: "玛格丽特披萨",
    nameEn: "Margherita Pizza",
    category: "pizza",
    price: 14.5,
    image: "/margherita-pizza.png",
    available: true,
  },
  {
    id: "4",
    name: "烤三文鱼",
    nameEn: "Grilled Salmon",
    category: "main",
    price: 28.9,
    image: "/grilled-salmon-plate.png",
    available: true,
    popular: true,
  },
  {
    id: "5",
    name: "提拉米苏",
    nameEn: "Tiramisu",
    category: "desserts",
    price: 8.5,
    image: "/classic-tiramisu.png",
    available: true,
  },
  {
    id: "6",
    name: "意式浓缩咖啡",
    nameEn: "Espresso",
    category: "drinks",
    price: 3.5,
    image: "/espresso-coffee.jpg",
    available: true,
  },
  {
    id: "7",
    name: "海鲜意面",
    nameEn: "Seafood Pasta",
    category: "pasta",
    price: 22.8,
    image: "/seafood-pasta.png",
    available: true,
    spicy: 1,
  },
  {
    id: "8",
    name: "四季披萨",
    nameEn: "Quattro Stagioni",
    category: "pizza",
    price: 18.5,
    image: "/quattro-stagioni-pizza.jpg",
    available: true,
  },
  {
    id: "9",
    name: "牛排",
    nameEn: "Ribeye Steak",
    category: "main",
    price: 35.9,
    image: "/grilled-ribeye.png",
    available: true,
  },
  {
    id: "10",
    name: "意式奶冻",
    nameEn: "Panna Cotta",
    category: "desserts",
    price: 7.5,
    image: "/creamy-panna-cotta.png",
    available: true,
  },
  {
    id: "11",
    name: "卡布奇诺",
    nameEn: "Cappuccino",
    category: "drinks",
    price: 4.5,
    image: "/frothy-cappuccino.png",
    available: true,
  },
  {
    id: "12",
    name: "布鲁斯凯塔",
    nameEn: "Bruschetta",
    category: "appetizers",
    price: 9.8,
    image: "/classic-bruschetta.png",
    available: true,
  },
]

const mockTables = [
  { id: "1", number: "A-01", status: "occupied" },
  { id: "2", number: "A-02", status: "idle" },
  { id: "3", number: "A-03", status: "occupied" },
  { id: "4", number: "B-01", status: "occupied" },
  { id: "5", number: "B-02", status: "idle" },
]

export function POSInterface() {
  const searchParams = useSearchParams()
  const initialTableId = useMemo(() => {
    const byId = searchParams.get("tableId")
    if (byId) return byId
    const byNumber = searchParams.get("tableNumber")
    if (byNumber) {
      const found = mockTables.find((t) => t.number === byNumber)
      return found?.id || ""
    }
    return ""
  }, [searchParams])

  const [selectedCategory, setSelectedCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedTable, setSelectedTable] = useState<string>(initialTableId)
  const [checkoutDialog, setCheckoutDialog] = useState(false)
  const [discount, setDiscount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [hangUpDialog, setHangUpDialog] = useState(false)
  const [splitTableDialog, setSplitTableDialog] = useState(false)
  const [mergeTableDialog, setMergeTableDialog] = useState(false)
  const [operationStatus, setOperationStatus] = useState<"closed" | "open" | "pending">(
    initialTableId ? "open" : "closed",
  )

  useEffect(() => {
    // If the tableId param changes (e.g., via navigation), reflect it in local state
    if (initialTableId && initialTableId !== selectedTable) {
      setSelectedTable(initialTableId)
      setOperationStatus("open")
    }
  }, [initialTableId])

  const filteredItems = mockMenuItems.filter((item) => {
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

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const discountAmount = (subtotal * discount) / 100
  const total = subtotal - discountAmount

  const handleCheckout = () => {
    console.log("[v0] Processing checkout:", { cart, selectedTable, total, paymentMethod })
    setCheckoutDialog(false)
    setCart([])
    setSelectedTable("")
    setDiscount(0)
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
                ? `当前桌台: ${mockTables.find((t) => t.id === selectedTable)?.number || searchParams.get("tableNumber") || "未知"}`
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
      <Card className="w-96 flex flex-col bg-card border-border">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">当前订单</h2>
            </div>
            <Badge variant="secondary">{cart.reduce((sum, item) => sum + item.quantity, 0)} 项</Badge>
          </div>

          {/* Table selection */}
          <Select value={selectedTable} onValueChange={setSelectedTable}>
            <SelectTrigger>
              <SelectValue placeholder="选择桌台" />
            </SelectTrigger>
            <SelectContent>
              {mockTables.map((table) => (
                <SelectItem key={table.id} value={table.id}>
                  {table.number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Cart items */}
        <ScrollArea className="p-4 h-[300px]">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <ShoppingCart className="w-12 h-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">购物车为空</p>
              <p className="text-sm text-muted-foreground mt-1">点击菜品添加到订单</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <Card key={item.id} className="p-3 bg-muted/30 border-border">
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
                        <span className="text-xs text-muted-foreground">单价 €{item.price.toFixed(2)}</span>
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
                        <span className="text-sm font-bold text-foreground">总价 €{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Cart summary */}
        {cart.length > 0 && (
          <>
            <div className="p-4 border-t border-border space-y-3">
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

              {/* Enhanced operation bar: Add order, add items, split table, merge table, hold order, etc. */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="gap-1 text-xs bg-transparent"
                  onClick={() => setHangUpDialog(true)}
                >
                  <Hook className="w-3 h-3" />
                  <span className="hidden sm:inline">挂单</span>
                </Button>
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
                <Button variant="outline" className="gap-2 bg-transparent" onClick={() => setCart([])}>
                  <Trash2 className="w-4 h-4" />
                  清空
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  className="gap-2"
                  onClick={() => {
                    /* Add item logic */
                  }}
                >
                  <Plus className="w-4 h-4" />
                  加菜
                </Button>
                <Button className="gap-2" onClick={() => setCheckoutDialog(true)} disabled={!selectedTable}>
                  <Receipt className="w-4 h-4" />
                  结账
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Checkout Dialog */}
      <Dialog open={checkoutDialog} onOpenChange={setCheckoutDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>订单结账</DialogTitle>
            <DialogDescription>桌台: {mockTables.find((t) => t.id === selectedTable)?.number}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Order summary */}
            <div className="space-y-2">
              <Label>订单明细</Label>
              <Card className="p-3 bg-muted/30 border-border max-h-40 overflow-y-auto">
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">
                        {item.name} x{item.quantity}
                      </span>
                      <span className="text-muted-foreground">€{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
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

      {/* Hold Order Dialog */}
      <Dialog open={hangUpDialog} onOpenChange={setHangUpDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>挂单</DialogTitle>
            <DialogDescription>将当前订单暂存，稍后可恢复继续操作</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-accent/10 rounded-lg border border-accent/50">
              <p className="text-sm text-foreground">
                待挂单项目数：<span className="font-bold">{cart.length}</span>
              </p>
              <p className="text-sm text-foreground">
                总金额：<span className="font-bold text-primary">€{total.toFixed(2)}</span>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHangUpDialog(false)}>
              取消
            </Button>
            <Button
              onClick={() => {
                setHangUpDialog(false)
                setCart([])
              }}
            >
              确认挂单
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
  )
}
