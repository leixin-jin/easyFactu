"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { RestaurantTableView } from "@/hooks/useRestaurantTables"

/**
 * PosHeader 组件 Props
 */
export interface PosHeaderProps {
    variant: "menu" | "order"
    tables: RestaurantTableView[]
    loadingTables: boolean
    loadError: string | null
    selectedTable: string
    onSelectedTableChange: (tableId: string) => void
    tableNumberParam: string
}

/**
 * POS 顶部导航组件
 * - variant="menu": 渲染在左列顶部，显示返回桌台按钮
 * - variant="order": 渲染在右列顶部（PosOrderPanel 卡片头部内），显示桌台选择下拉框
 */
export function PosHeader({
    variant,
    tables,
    loadingTables,
    loadError,
    selectedTable,
    onSelectedTableChange,
}: PosHeaderProps) {
    const sortedTables = [...tables].sort((a, b) => a.number.localeCompare(b.number, "zh-CN"))

    if (variant === "menu") {
        return (
            <div className="flex justify-end">
                <Link href="/tables">
                    <Button variant="outline" size="sm" className="gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        返回桌台
                    </Button>
                </Link>
            </div>
        )
    }

    // variant === "order"
    return (
        <div>
            <Select value={selectedTable} onValueChange={onSelectedTableChange}>
                <SelectTrigger>
                    <SelectValue placeholder="选择桌台" />
                </SelectTrigger>
                <SelectContent>
                    {sortedTables.map((table) => (
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
    )
}
