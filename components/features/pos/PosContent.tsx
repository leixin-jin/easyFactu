"use client"

import { useState, useMemo } from "react"

import { PosMenuPane } from "./PosMenuPane"
import type { MenuItem } from "@/types/pos"

/**
 * PosContent 组件 Props
 */
export interface PosContentProps {
    menuCategories: { id: string; name: string }[]
    menuItems: MenuItem[]
    onAddToCart: (item: MenuItem) => void
}

/**
 * POS 主内容区组件
 * 封装菜单选择逻辑，管理分类和搜索状态
 */
export function PosContent({
    menuCategories,
    menuItems,
    onAddToCart,
}: PosContentProps) {
    // 分类状态
    const [selectedCategory, setSelectedCategory] = useState("all")

    // 搜索状态
    const [searchQuery, setSearchQuery] = useState("")

    // 根据分类和搜索筛选菜品
    const filteredItems = useMemo(() => {
        return menuItems.filter((item) => {
            const matchesCategory = selectedCategory === "all" || item.category === selectedCategory
            const matchesSearch =
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.nameEn.toLowerCase().includes(searchQuery.toLowerCase())
            return matchesCategory && matchesSearch
        })
    }, [menuItems, selectedCategory, searchQuery])

    return (
        <PosMenuPane
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            menuCategories={menuCategories}
            filteredItems={filteredItems}
            onAddToCart={onAddToCart}
        />
    )
}
