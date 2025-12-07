"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { useMenuData } from "@/hooks/useMenuData"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { Textarea } from "@/components/ui/textarea"
import { Plus, Search, Edit, Trash2, MoreVertical, ImageIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"

interface MenuItem {
  id: string
  name: string
  nameEn: string
  category: string
  price: number
  cost?: number
  description?: string
  image: string
  allergens?: string[]
  sales?: number
  revenue?: number
}

interface Category {
  id: string
  name: string
  count?: number
}

const DEFAULT_CATEGORIES: Category[] = [{ id: "all", name: "全部菜品", count: 0 }]

export function MenuManagement() {
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const { items: fetchedItems } = useMenuData()
  const [items, setItems] = useState<MenuItem[]>([])
  const [dynamicCategories, setDynamicCategories] = useState<Category[]>(DEFAULT_CATEGORIES)
  const [editDialog, setEditDialog] = useState(false)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [isNewItem, setIsNewItem] = useState(false)

  // 同步 Hook 数据到本地可编辑状态
  useEffect(() => {
    setItems(
      Array.isArray(fetchedItems)
        ? fetchedItems.map((i) => ({
            id: String(i.id),
            name: String(i.name ?? ""),
            nameEn: String(i.nameEn ?? ""),
            category: String(i.category ?? "uncategorized"),
            price: typeof i.price === "number" ? i.price : Number(i.price ?? 0),
            image: String(i.image ?? ""),
          }))
        : [],
    )
  }, [fetchedItems])

  // 基于当前 items 计算分类与计数
  useEffect(() => {
    const counts = new Map<string, number>()
    for (const it of items) counts.set(it.category, (counts.get(it.category) ?? 0) + 1)
    const ids = Array.from(counts.keys())
    const cats: Category[] = [
      { id: "all", name: "全部菜品", count: items.length },
      ...ids.map((id) => ({ id, name: id, count: counts.get(id) ?? 0 })),
    ]
    setDynamicCategories(cats)

    // 保证选中分类有效
    const valid = new Set(cats.map((c) => c.id))
    if (!valid.has(selectedCategory)) setSelectedCategory("all")
  }, [items, selectedCategory])

  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nameEn.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const handleEdit = (item: MenuItem) => {
    setSelectedItem(item)
    setIsNewItem(false)
    setEditDialog(true)
  }

  const handleNew = () => {
    setSelectedItem({
      id: Date.now().toString(),
      name: "",
      nameEn: "",
      category: "main",
      price: 0,
      cost: 0,
      description: "",
      image: "/placeholder.svg",
    })
    setIsNewItem(true)
    setEditDialog(true)
  }

  const handleSave = () => {
    if (selectedItem) {
      if (isNewItem) {
        setItems([...items, selectedItem])
      } else {
        setItems(items.map((item) => (item.id === selectedItem.id ? selectedItem : item)))
      }
    }
    setEditDialog(false)
  }

  const handleDelete = (id: string) => {
    setItems(items.filter((item) => item.id !== id))
  }

  const stats = {
    total: items.length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground text-balance">菜单管理</h1>
          <p className="text-muted-foreground mt-1">管理餐厅菜品和价格</p>
        </div>
        <Button className="gap-2" onClick={handleNew}>
          <Plus className="w-4 h-4" />
          添加菜品
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-card border-border">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">总菜品</p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </div>
        </Card>
      </div>

      {/* Search and filters */}
      <Card className="p-4 bg-card border-border">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索菜品名称..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </Card>

      {/* Categories and items */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Categories sidebar */}
        <Card className="p-4 bg-card border-border h-fit">
          <h3 className="font-semibold text-foreground mb-4">分类</h3>
          <div className="space-y-1">
            {dynamicCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedCategory === category.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span>{category.name}</span>
                <Badge variant="secondary" className="bg-muted text-muted-foreground">
                  {category.count}
                </Badge>
              </button>
            ))}
          </div>
        </Card>

        {/* Items list */}
        <div className="lg:col-span-3">
          <Card className="bg-card border-border">
            <ScrollArea className="h-[600px]">
              <div className="p-4 space-y-3">
                {filteredItems.map((item) => (
                  <Card
                    key={item.id}
                    className="p-4 bg-muted/30 border-border hover:border-primary/50 transition-colors"
                  >
                    <div className="flex gap-4">
                      {/* Image */}
                      <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {(() => {
                          const rawSrc = (item.image ?? "").trim()
                          const isValidAbsolute = rawSrc.startsWith("http://") || rawSrc.startsWith("https://")
                          const isValidRelative = rawSrc.startsWith("/")
                          const imageSrc = rawSrc && (isValidAbsolute || isValidRelative) ? rawSrc : "/placeholder.svg"
                          return (
                            <Image
                              src={imageSrc}
                              alt={item.name}
                              width={96}
                              height={96}
                              className="w-full h-full object-cover"
                              sizes="96px"
                            />
                          )
                        })()}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-foreground">{item.name}</h3>
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">{item.nameEn}</p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                            )}
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(item)}>
                                <Edit className="w-4 h-4 mr-2" />
                                编辑
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(item.id)} className="text-destructive">
                                <Trash2 className="w-4 h-4 mr-2" />
                                删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">售价</p>
                            <p className="text-lg font-bold text-primary">€{item.price.toFixed(2)}</p>
                          </div>
                          {item.cost && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">成本</p>
                              <p className="text-sm font-medium text-foreground">€{item.cost.toFixed(2)}</p>
                            </div>
                          )}
                          {item.sales && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">销量</p>
                              <p className="text-sm font-medium text-foreground">{item.sales}</p>
                            </div>
                          )}
                          {item.revenue && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">营收</p>
                              <p className="text-sm font-medium text-foreground">€{item.revenue.toFixed(0)}</p>
                            </div>
                          )}
                        </div>

                        {/* Allergens */}
                        {item.allergens && item.allergens.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.allergens.map((allergen) => (
                              <Badge
                                key={allergen}
                                variant="secondary"
                                className="bg-muted text-muted-foreground text-xs"
                              >
                                {allergen}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </div>
      </div>

      {/* Edit/Add Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNewItem ? "添加菜品" : "编辑菜品"}</DialogTitle>
            <DialogDescription>{isNewItem ? "填写新菜品信息" : "修改菜品信息"}</DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">中文名称 *</Label>
                  <Input
                    id="name"
                    value={selectedItem.name}
                    onChange={(e) => setSelectedItem({ ...selectedItem, name: e.target.value })}
                    placeholder="例: 凯撒沙拉"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nameEn">英文名称 *</Label>
                  <Input
                    id="nameEn"
                    value={selectedItem.nameEn}
                    onChange={(e) => setSelectedItem({ ...selectedItem, nameEn: e.target.value })}
                    placeholder="e.g. Caesar Salad"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">描述</Label>
                <Textarea
                  id="description"
                  value={selectedItem.description || ""}
                  onChange={(e) => setSelectedItem({ ...selectedItem, description: e.target.value })}
                  placeholder="菜品描述..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">分类 *</Label>
                <Select
                  value={selectedItem.category}
                  onValueChange={(value) => setSelectedItem({ ...selectedItem, category: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="appetizers">开胃菜</SelectItem>
                    <SelectItem value="main">主菜</SelectItem>
                    <SelectItem value="pasta">意面</SelectItem>
                    <SelectItem value="pizza">披萨</SelectItem>
                    <SelectItem value="desserts">甜品</SelectItem>
                    <SelectItem value="drinks">饮品</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">售价 (€) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={selectedItem.price}
                    onChange={(e) => setSelectedItem({ ...selectedItem, price: Number.parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost">成本 (€)</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    value={selectedItem.cost || 0}
                    onChange={(e) => setSelectedItem({ ...selectedItem, cost: Number.parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">图片URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="image"
                    value={selectedItem.image}
                    onChange={(e) => setSelectedItem({ ...selectedItem, image: e.target.value })}
                    placeholder="/path/to/image.jpg"
                  />
                  <Button variant="outline" size="icon">
                    <ImageIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>{isNewItem ? "添加" : "保存"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
