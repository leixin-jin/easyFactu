"use client"

import Link from "next/link"
import { ArrowLeft, Plus, Search } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { RestaurantTableView as TableOption } from "@/hooks/useRestaurantTables"
import Image from "next/image"

import type { MenuItem } from "@/types/pos"

export interface PosMenuPaneProps {
  selectedTable: string
  tables: TableOption[]
  tableNumberParam: string
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  selectedCategory: string
  onCategoryChange: (value: string) => void
  menuCategories: { id: string; name: string }[]
  filteredItems: MenuItem[]
  onAddToCart: (item: MenuItem) => void
}

export function PosMenuPane({
  selectedTable,
  tables,
  tableNumberParam,
  searchQuery,
  onSearchQueryChange,
  selectedCategory,
  onCategoryChange,
  menuCategories,
  filteredItems,
  onAddToCart,
}: PosMenuPaneProps) {
  const currentTableNumber =
    selectedTable && tables.length > 0
      ? tables.find((t) => t.id === selectedTable)?.number || "未知"
      : tableNumberParam || ""

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground text-balance">点单系统</h1>
          <p className="text-muted-foreground mt-1">
            {currentTableNumber ? `当前桌台: ${currentTableNumber}` : "选择菜品并添加到订单"}
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
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Categories */}
      <Tabs
        value={selectedCategory}
        onValueChange={onCategoryChange}
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
                  onClick={() => onAddToCart(item)}
                >
                  <div className="aspect-square relative overflow-hidden bg-muted">
                    {(() => {
                      const rawSrc = (item.image ?? "").trim()
                      const isValidAbsolute = rawSrc.startsWith("http://") || rawSrc.startsWith("https://")
                      const isValidRelative = rawSrc.startsWith("/")
                      const imageSrc = rawSrc && (isValidAbsolute || isValidRelative) ? rawSrc : "/placeholder.svg"
                      return (
                        <Image
                          src={imageSrc}
                          alt={item.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                          sizes="(min-width: 1024px) 200px, (min-width: 768px) 180px, 50vw"
                          priority={false}
                        />
                      )
                    })()}
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
                          onAddToCart(item)
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
  )
}
