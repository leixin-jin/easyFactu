"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import type { CheckoutReceiptData } from "@/types/pos"

/**
 * Hook 参数接口
 */
export interface UsePosPrintingParams {
    printData: CheckoutReceiptData | null
    isPrinting: boolean
    onPrintComplete: () => void
}

/**
 * POS 打印 Hook
 * 处理结账成功后的打印触发和路由跳转
 */
export function usePosPrinting(params: UsePosPrintingParams): void {
    const { printData, isPrinting, onPrintComplete } = params
    const router = useRouter()

    useEffect(() => {
        if (!isPrinting || !printData) return

        const timer = setTimeout(() => {
            if (typeof window !== "undefined") {
                window.print()
            }
            onPrintComplete()
            router.push("/tables")
        }, 0)

        return () => clearTimeout(timer)
    }, [isPrinting, printData, router, onPrintComplete])
}
