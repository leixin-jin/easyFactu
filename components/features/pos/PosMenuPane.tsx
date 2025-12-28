"use client"

import { Plus, Search } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import Image from "next/image"

import type { MenuItem } from "@/types/pos"

export interface PosMenuPaneProps {
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  selectedCategory: string
  onCategoryChange: (value: string) => void
  menuCategories: { id: string; name: string }[]
  filteredItems: MenuItem[]
  onAddToCart: (item: MenuItem) => void
}

export function PosMenuPane({
  searchQuery,
  onSearchQueryChange,
  selectedCategory,
  onCategoryChange,
  menuCategories,
  filteredItems,
  onAddToCart,
}: PosMenuPaneProps) {
  return (
    <div className="flex-1 flex flex-col gap-4 overflow-hidden">
      {/* Categories */}
      <Tabs
        value={selectedCategory}
        onValueChange={onCategoryChange}
        className="flex-1 flex flex-col overflow-hidden gap-3"
      >
        <TabsList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 !bg-transparent !p-0 !h-auto !w-full max-h-24 overflow-y-auto pr-1">
          {menuCategories.map((category) => (
            <TabsTrigger
              key={category.id}
              value={category.id}
              className="flex-shrink-0 !h-10 text-sm"
            >
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>

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

        <TabsContent value={selectedCategory} className="flex-1 mt-4 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3 pb-3">
              {filteredItems.map((item) => (
                <Card
                  key={item.id}
                  className="overflow-hidden cursor-pointer hover:border-primary transition-colors group border-border/70"
                  onClick={() => onAddToCart(item)}
                >
                  <div className="relative overflow-hidden bg-muted" style={{ aspectRatio: "4 / 3" }}>
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
                  <div className="p-2.5 space-y-0.5">
                    <h3 className="font-medium text-foreground text-sm leading-tight">{item.name}</h3>
                    <p className="text-[11px] text-muted-foreground">{item.nameEn}</p>
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-base font-semibold text-primary">€{item.price.toFixed(2)}</span>
                      <Button
                        size="icon"
                        className="h-6 w-6"
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
