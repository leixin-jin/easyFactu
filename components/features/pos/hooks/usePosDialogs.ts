"use client"

import { useState } from "react"

import { useToast } from "@/hooks/use-toast"
import type { OrderBatchView } from "@/types/pos"

/**
 * Hook 参数接口
 */
export interface UsePosDialogsParams {
    selectedTable: string
    loadingOrder: boolean
    batches: OrderBatchView[]
}

/**
 * Hook 返回值接口
 */
export interface UsePosDialogsReturn {
    // 拆台对话框
    splitDialogOpen: boolean
    setSplitDialogOpen: (open: boolean) => void // 直接传递给 Dialog onOpenChange
    openSplitDialog: () => void // 包含验证逻辑

    // 并台对话框
    mergeDialogOpen: boolean
    setMergeDialogOpen: (open: boolean) => void // 直接传递给 Dialog onOpenChange
    openMergeDialog: () => void // 包含验证逻辑
}

/**
 * POS 对话框状态管理 Hook
 * 管理拆台和并台对话框的状态
 */
export function usePosDialogs(params: UsePosDialogsParams): UsePosDialogsReturn {
    const { selectedTable, loadingOrder, batches } = params

    const { toast } = useToast()

    // 对话框状态
    const [splitDialogOpen, setSplitDialogOpen] = useState(false)
    const [mergeDialogOpen, setMergeDialogOpen] = useState(false)

    /**
     * 打开拆台对话框（包含业务验证逻辑）
     */
    const openSplitDialog = () => {
        if (!selectedTable) {
            toast({
                title: "未选择桌台",
                description: "请先在右侧选择一个桌台，再拆台。",
                variant: "destructive",
            })
            return
        }
        if (loadingOrder) {
            toast({
                title: "正在加载订单",
                description: "请稍候，订单加载完成后再拆台。",
                variant: "destructive",
            })
            return
        }
        if (batches.length === 0) {
            toast({
                title: "当前订单为空",
                description: "没有可拆分的已下单菜品。",
                variant: "destructive",
            })
            return
        }
        setSplitDialogOpen(true)
    }

    /**
     * 打开并台对话框（包含业务验证逻辑）
     */
    const openMergeDialog = () => {
        if (!selectedTable) {
            toast({
                title: "未选择桌台",
                description: "请先在右侧选择一个桌台，再并台。",
                variant: "destructive",
            })
            return
        }
        setMergeDialogOpen(true)
    }

    return {
        splitDialogOpen,
        setSplitDialogOpen,
        openSplitDialog,
        mergeDialogOpen,
        setMergeDialogOpen,
        openMergeDialog,
    }
}
