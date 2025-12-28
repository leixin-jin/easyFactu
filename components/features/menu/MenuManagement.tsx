"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { Loader2, Minus, Pencil, Plus, Search } from "lucide-react"

import { useMenuData, type UIMenuItem } from "@/hooks/useMenuData"
import { useToast } from "@/hooks/use-toast"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { ImageUpload } from "@/components/features/menu/ImageUpload"
import { useCreateMenuItem, useDeleteMenuItem, useUpdateMenuItem } from "@/lib/queries"

interface Category {
  id: string
  name: string
  count?: number
}

interface MenuForm {
  name: string
  nameEn: string
  category: string
  price: string
  description: string
  image: string
}

type MenuFormErrors = Partial<Record<keyof MenuForm, string>>

const DECIMAL_PATTERN = /^\d+(\.\d{1,2})?$/

const createEmptyForm = (category?: string): MenuForm => ({
  name: "",
  nameEn: "",
  category: category && category !== "all" ? category : "",
  price: "",
  description: "",
  image: "",
})

const createFormFromItem = (item: UIMenuItem): MenuForm => ({
  name: item.name ?? "",
  nameEn: item.nameEn ?? "",
  category: item.category ?? "",
  price: Number.isFinite(item.price) ? String(item.price) : "",
  description: item.description ?? "",
  image: item.image ?? "",
})

const validateMenuForm = (form: MenuForm): MenuFormErrors => {
  const errors: MenuFormErrors = {}

  if (!form.name.trim()) {
    errors.name = "请输入英文名称"
  }

  if (!form.category.trim()) {
    errors.category = "请输入分类"
  }

  const priceValue = form.price.trim()
  if (!priceValue) {
    errors.price = "请输入售价"
  } else if (!DECIMAL_PATTERN.test(priceValue)) {
    errors.price = "售价需为最多两位小数的正数"
  } else if (Number.parseFloat(priceValue) <= 0) {
    errors.price = "售价必须大于 0"
  }

  return errors
}

export function MenuManagement() {
  const { toast } = useToast()
  const { items: fetchedItems, loading: menuLoading, error: menuError, refresh } = useMenuData()

  const [selectedCategory, setSelectedCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const [addForm, setAddForm] = useState<MenuForm>(createEmptyForm())
  const [customCategory, setCustomCategory] = useState("")
  const [addErrors, setAddErrors] = useState<MenuFormErrors>({})
  const [addServerError, setAddServerError] = useState<string | null>(null)
  const [addUploading, setAddUploading] = useState(false)

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<UIMenuItem | null>(null)
  const [editForm, setEditForm] = useState<MenuForm>(createEmptyForm())
  const [editCustomCategory, setEditCustomCategory] = useState("")
  const [editErrors, setEditErrors] = useState<MenuFormErrors>({})
  const [editServerError, setEditServerError] = useState<string | null>(null)
  const [editUploading, setEditUploading] = useState(false)

  const [deleteSelection, setDeleteSelection] = useState("")
  const [deleteServerError, setDeleteServerError] = useState<string | null>(null)

  const createMenuItemMutation = useCreateMenuItem()
  const updateMenuItemMutation = useUpdateMenuItem()
  const deleteMenuItemMutation = useDeleteMenuItem()

  const categories = useMemo<Category[]>(() => {
    const counts = new Map<string, number>()
    fetchedItems.forEach((item) => counts.set(item.category, (counts.get(item.category) ?? 0) + 1))
    return [
      { id: "all", name: "全部菜品", count: fetchedItems.length },
      ...Array.from(counts.entries()).map(([id, count]) => ({ id, name: id, count })),
    ]
  }, [fetchedItems])

  useEffect(() => {
    const validIds = new Set(categories.map((c) => c.id))
    if (!validIds.has(selectedCategory)) {
      setSelectedCategory("all")
    }
  }, [categories, selectedCategory])

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return fetchedItems.filter((item) => {
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        (item.nameEn ?? "").toLowerCase().includes(query)
      return matchesCategory && matchesSearch
    })
  }, [fetchedItems, selectedCategory, searchQuery])

  const deletableItems = useMemo(
    () =>
      [...fetchedItems].sort((a, b) => {
        if (a.category === b.category) return a.name.localeCompare(b.name, "zh-CN")
        return a.category.localeCompare(b.category, "zh-CN")
      }),
    [fetchedItems],
  )

  const stats = useMemo(
    () => ({
      total: fetchedItems.length,
    }),
    [fetchedItems],
  )

  const categorySuggestions = useMemo(
    () => categories.filter((c) => c.id !== "all").map((c) => c.name),
    [categories],
  )

  const selectedExistingCategory = categorySuggestions.includes(addForm.category) ? addForm.category : ""
  const selectedEditCategory = categorySuggestions.includes(editForm.category) ? editForm.category : ""
  const addSubmitting = createMenuItemMutation.isPending || addUploading
  const editSubmitting = updateMenuItemMutation.isPending || editUploading

  const openAddDialog = () => {
    setAddForm(createEmptyForm(selectedCategory))
    setCustomCategory("")
    setAddErrors({})
    setAddServerError(null)
    setAddUploading(false)
    setAddDialogOpen(true)
  }

  const handleAddDialogToggle = (open: boolean) => {
    setAddDialogOpen(open)
    if (!open) {
      setAddForm(createEmptyForm(selectedCategory))
      setCustomCategory("")
      setAddErrors({})
      setAddServerError(null)
      setAddUploading(false)
    }
  }

  const handleDeleteDialogToggle = (open: boolean) => {
    setDeleteDialogOpen(open)
    if (!open) {
      setDeleteSelection("")
      setDeleteServerError(null)
    }
  }

  const openEditDialog = (item: UIMenuItem) => {
    setEditTarget(item)
    setEditForm(createFormFromItem(item))
    setEditCustomCategory("")
    setEditErrors({})
    setEditServerError(null)
    setEditUploading(false)
    setEditDialogOpen(true)
  }

  const handleEditDialogToggle = (open: boolean) => {
    setEditDialogOpen(open)
    if (!open) {
      setEditTarget(null)
      setEditForm(createEmptyForm())
      setEditCustomCategory("")
      setEditErrors({})
      setEditServerError(null)
      setEditUploading(false)
    }
  }

  const handleAddFieldChange = <T extends keyof MenuForm>(field: T, value: MenuForm[T]) => {
    setAddForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleEditFieldChange = <T extends keyof MenuForm>(field: T, value: MenuForm[T]) => {
    setEditForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleCategorySelect = (value: string) => {
    setCustomCategory("")
    handleAddFieldChange("category", value)
  }

  const handleCustomCategoryChange = (value: string) => {
    setCustomCategory(value)
    handleAddFieldChange("category", value)
  }

  const handleEditCategorySelect = (value: string) => {
    setEditCustomCategory("")
    handleEditFieldChange("category", value)
  }

  const handleEditCustomCategoryChange = (value: string) => {
    setEditCustomCategory(value)
    handleEditFieldChange("category", value)
  }

  const handleAddSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    if (addUploading) {
      toast({
        title: "图片上传中",
        description: "请等待图片上传完成后再提交。",
        variant: "destructive",
      })
      return
    }
    const errors = validateMenuForm(addForm)
    setAddErrors(errors)
    if (Object.keys(errors).length > 0) return

    try {
      setAddServerError(null)

      const created = await createMenuItemMutation.mutateAsync({
        name: addForm.name.trim(),
        nameEn: addForm.nameEn.trim() || undefined,
        category: addForm.category.trim(),
        price: parseFloat(addForm.price.trim()),
        description: addForm.description.trim() || undefined,
        image: addForm.image.trim() || undefined,
      })
      toast({
        title: "菜品已添加",
        description: created?.name ? `${created.name} 已加入 ${created.category}` : "菜品已添加到菜单",
      })
      handleAddDialogToggle(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "添加菜品失败"
      setAddServerError(message)
      toast({
        title: "添加菜品失败",
        description: message,
        variant: "destructive",
      })
    }
  }

  const handleEditSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    if (!editTarget) {
      setEditServerError("请选择要编辑的菜品")
      return
    }
    if (editUploading) {
      toast({
        title: "图片上传中",
        description: "请等待图片上传完成后再提交。",
        variant: "destructive",
      })
      return
    }

    const errors = validateMenuForm(editForm)
    setEditErrors(errors)
    if (Object.keys(errors).length > 0) return

    try {
      setEditServerError(null)

      const updated = await updateMenuItemMutation.mutateAsync({
        id: editTarget.id,
        data: {
          name: editForm.name.trim(),
          nameEn: editForm.nameEn.trim(),
          category: editForm.category.trim(),
          price: parseFloat(editForm.price.trim()),
          description: editForm.description.trim(),
          image: editForm.image.trim(),
        },
      })

      toast({
        title: "菜品已更新",
        description: updated?.name ? `${updated.name} 已更新` : "菜品信息已更新",
      })
      handleEditDialogToggle(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "更新菜品失败"
      setEditServerError(message)
      toast({
        title: "更新菜品失败",
        description: message,
        variant: "destructive",
      })
    }
  }

  const handleDeleteSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    if (!deleteSelection) {
      setDeleteServerError("请选择要删除的菜品")
      return
    }

    try {
      setDeleteServerError(null)

      const removed = await deleteMenuItemMutation.mutateAsync(deleteSelection)
      toast({
        title: "菜品已删除",
        description: removed?.name ? `${removed.name} 已标记为下架` : "菜品已隐藏",
      })
      handleDeleteDialogToggle(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "删除菜品失败"
      setDeleteServerError(message)
      toast({
        title: "删除菜品失败",
        description: message,
        variant: "destructive",
      })
    }
  }

  const hasMenuError = Boolean(menuError)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground text-balance">菜单管理</h1>
          <p className="text-muted-foreground mt-1">管理餐厅菜品和价格</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button className="flex-1 sm:flex-none" onClick={openAddDialog}>
            <Plus className="w-4 h-4 mr-2" />
            增加菜品
          </Button>
          <Button
            className="flex-1 sm:flex-none"
            variant="destructive"
            onClick={() => handleDeleteDialogToggle(true)}
            disabled={fetchedItems.length === 0}
          >
            <Minus className="w-4 h-4 mr-2" />
            删除菜品
          </Button>
        </div>
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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索菜品名称..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {hasMenuError && (
          <p className="text-sm text-destructive mt-3">
            菜单数据加载失败，请检查数据库连接或{" "}
            <button type="button" className="underline" onClick={() => refresh()}>
              重试
            </button>
            。
          </p>
        )}
      </Card>

      {/* Categories and items */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Categories sidebar */}
        <Card className="p-4 bg-card border-border h-fit">
          <h3 className="font-semibold text-foreground mb-4">分类</h3>
          <div className="space-y-1">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${selectedCategory === category.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
              >
                <span>{category.name}</span>
                <Badge variant="secondary" className="bg-muted text-muted-foreground">
                  {category.count ?? 0}
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
                {menuLoading && (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="h-28 rounded-lg bg-muted/40 animate-pulse" />
                    ))}
                  </div>
                )}

                {!menuLoading && filteredItems.length === 0 && (
                  <div className="h-40 flex flex-col items-center justify-center text-muted-foreground gap-1">
                    <p className="text-sm">暂无匹配的菜品</p>
                    <p className="text-xs">尝试更换分类或清空搜索条件</p>
                  </div>
                )}

                {!menuLoading &&
                  filteredItems.map((item) => (
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
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-foreground">{item.name}</h3>
                              </div>
                              <p className="text-sm text-muted-foreground mb-1">{item.nameEn}</p>
                              {item.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <p className="text-lg font-bold text-primary whitespace-nowrap">€{item.price.toFixed(2)}</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2"
                                onClick={() => openEditDialog(item)}
                              >
                                <Pencil className="w-4 h-4 mr-1" />
                                编辑
                              </Button>
                            </div>
                          </div>

                          {/* Details */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">分类</p>
                              <p className="text-sm font-medium text-foreground">{item.category}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
              </div>
            </ScrollArea>
          </Card>
        </div>
      </div>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={handleAddDialogToggle}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleAddSubmit}>
            <DialogHeader>
              <DialogTitle>增加菜品</DialogTitle>
              <DialogDescription>填写菜品信息，提交后会立即出现在菜单中。</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {addServerError && <p className="text-sm text-destructive">{addServerError}</p>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="menu-name-en">英文名称 *</Label>
                  <Input
                    id="menu-name-en"
                    value={addForm.name}
                    onChange={(e) => handleAddFieldChange("name", e.target.value)}
                    aria-invalid={Boolean(addErrors.name)}
                    placeholder="e.g. Caesar Salad"
                  />
                  {addErrors.name && <p className="text-xs text-destructive">{addErrors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="menu-name-zh">中文名称</Label>
                  <Input
                    id="menu-name-zh"
                    value={addForm.nameEn}
                    onChange={(e) => handleAddFieldChange("nameEn", e.target.value)}
                    placeholder="例: 凯撒沙拉"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="menu-category">分类 *</Label>
                  <Select value={selectedExistingCategory} onValueChange={handleCategorySelect}>
                    <SelectTrigger id="menu-category">
                      <SelectValue placeholder="选择已有分类" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorySuggestions.length === 0 && (
                        <SelectItem value="" disabled>
                          暂无分类
                        </SelectItem>
                      )}
                      {categorySuggestions.map((entry) => (
                        <SelectItem key={entry} value={entry}>
                          {entry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="menu-new-category"
                    value={customCategory}
                    onChange={(e) => handleCustomCategoryChange(e.target.value)}
                    aria-invalid={Boolean(addErrors.category)}
                    aria-label="新分类"
                    placeholder="或输入新分类"
                  />
                  {addErrors.category && <p className="text-xs text-destructive">{addErrors.category}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="menu-price">售价 (€) *</Label>
                  <Input
                    id="menu-price"
                    inputMode="decimal"
                    value={addForm.price}
                    onChange={(e) => handleAddFieldChange("price", e.target.value)}
                    aria-invalid={Boolean(addErrors.price)}
                    placeholder="12.90"
                  />
                  {addErrors.price && <p className="text-xs text-destructive">{addErrors.price}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="menu-description">描述</Label>
                <Textarea
                  id="menu-description"
                  value={addForm.description}
                  onChange={(e) => handleAddFieldChange("description", e.target.value)}
                  placeholder="菜品亮点、主要原料等信息..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>图片</Label>
                <ImageUpload
                  value={addForm.image || null}
                  onChange={(url) => handleAddFieldChange("image", url ?? "")}
                  onError={(message) => {
                    toast({
                      title: "图片上传失败",
                      description: message,
                      variant: "destructive",
                    })
                  }}
                  onUploadingChange={setAddUploading}
                  disabled={addSubmitting}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleAddDialogToggle(false)}>
                取消
              </Button>
              <Button type="submit" disabled={addSubmitting}>
                {createMenuItemMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                提交
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={handleEditDialogToggle}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>编辑菜品</DialogTitle>
              <DialogDescription>更新菜品信息，保存后会立即生效。</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {editServerError && <p className="text-sm text-destructive">{editServerError}</p>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-menu-name-en">英文名称 *</Label>
                  <Input
                    id="edit-menu-name-en"
                    value={editForm.name}
                    onChange={(e) => handleEditFieldChange("name", e.target.value)}
                    aria-invalid={Boolean(editErrors.name)}
                    placeholder="e.g. Caesar Salad"
                  />
                  {editErrors.name && <p className="text-xs text-destructive">{editErrors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-menu-name-zh">中文名称</Label>
                  <Input
                    id="edit-menu-name-zh"
                    value={editForm.nameEn}
                    onChange={(e) => handleEditFieldChange("nameEn", e.target.value)}
                    placeholder="例: 凯撒沙拉"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-menu-category">分类 *</Label>
                  <Select value={selectedEditCategory} onValueChange={handleEditCategorySelect}>
                    <SelectTrigger id="edit-menu-category">
                      <SelectValue placeholder="选择已有分类" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorySuggestions.length === 0 && (
                        <SelectItem value="" disabled>
                          暂无分类
                        </SelectItem>
                      )}
                      {categorySuggestions.map((entry) => (
                        <SelectItem key={entry} value={entry}>
                          {entry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="edit-menu-new-category"
                    value={editCustomCategory}
                    onChange={(e) => handleEditCustomCategoryChange(e.target.value)}
                    aria-invalid={Boolean(editErrors.category)}
                    aria-label="新分类"
                    placeholder="或输入新分类"
                  />
                  {editErrors.category && <p className="text-xs text-destructive">{editErrors.category}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-menu-price">售价 (€) *</Label>
                  <Input
                    id="edit-menu-price"
                    inputMode="decimal"
                    value={editForm.price}
                    onChange={(e) => handleEditFieldChange("price", e.target.value)}
                    aria-invalid={Boolean(editErrors.price)}
                    placeholder="12.90"
                  />
                  {editErrors.price && <p className="text-xs text-destructive">{editErrors.price}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-menu-description">描述</Label>
                <Textarea
                  id="edit-menu-description"
                  value={editForm.description}
                  onChange={(e) => handleEditFieldChange("description", e.target.value)}
                  placeholder="菜品亮点、主要原料等信息..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>图片</Label>
                <ImageUpload
                  value={editForm.image || null}
                  onChange={(url) => handleEditFieldChange("image", url ?? "")}
                  onError={(message) => {
                    toast({
                      title: "图片上传失败",
                      description: message,
                      variant: "destructive",
                    })
                  }}
                  onUploadingChange={setEditUploading}
                  disabled={editSubmitting}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleEditDialogToggle(false)}>
                取消
              </Button>
              <Button type="submit" disabled={editSubmitting}>
                {updateMenuItemMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                保存
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogToggle}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleDeleteSubmit}>
            <DialogHeader>
              <DialogTitle>删除菜品</DialogTitle>
              <DialogDescription>删除后该菜品将被软删除，并在列表中隐藏。</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {deleteServerError && <p className="text-sm text-destructive">{deleteServerError}</p>}
              {deletableItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无可删除的菜品。</p>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="delete-menu-item">选择菜品 *</Label>
                  <Select value={deleteSelection} onValueChange={setDeleteSelection}>
                    <SelectTrigger id="delete-menu-item">
                      <SelectValue placeholder="请选择要删除的菜品" />
                    </SelectTrigger>
                    <SelectContent>
                      {deletableItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}（{item.category}）
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleDeleteDialogToggle(false)}>
                取消
              </Button>
              <Button type="submit" variant="destructive" disabled={!deleteSelection || deleteMenuItemMutation.isPending}>
                {deleteMenuItemMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                删除
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* datalist removed now that Select provides options */}
    </div>
  )
}
