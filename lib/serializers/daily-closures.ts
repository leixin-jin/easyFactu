/**
 * 日结 Serializer
 * 
 * 将数据库日结数据转换为 API 响应格式
 */

import { parseMoney } from '@/lib/money'

/**
 * 日结概览 DTO
 */
export interface DailyClosureOverviewDTO {
    grossRevenue: number
    netRevenue: number
    ordersCount: number
    averageOrderValueGross: number
    averageOrderValueNet: number
    refundAmount: number
    voidAmount: number
}

/**
 * 日结支付方式行 DTO
 */
export interface DailyClosurePaymentLineDTO {
    paymentMethod: string
    paymentGroup: string
    expectedAmount: number
    adjustmentsAmount: number
    actualAmount: number
}

/**
 * 日结菜品行 DTO
 */
export interface DailyClosureItemLineDTO {
    menuItemId: string | null
    name: string
    category: string
    quantitySold: number
    revenueAmount: number
    discountImpactAmount: number | null
}

/**
 * 日结调整 DTO
 */
export interface DailyClosureAdjustmentDTO {
    id: string
    type: string
    amount: number
    note: string
    paymentMethod: string | null
    createdAt: string
}

/**
 * 日结 DTO
 */
export interface DailyClosureDTO {
    periodStartAt: string | null
    periodEndAt: string | null
    sequenceNo: number | null
    businessDate?: string
    taxRate: number
    locked: boolean
    closureId: string | null
    lockedAt: string | null
    overview: DailyClosureOverviewDTO
    payments: {
        lines: DailyClosurePaymentLineDTO[]
        expectedTotal: number
        actualTotal: number
        difference: number
    }
    items: {
        categories: string[]
        lines: DailyClosureItemLineDTO[]
    }
    adjustments: DailyClosureAdjustmentDTO[]
}

/**
 * 序列化日结概览
 */
export function serializeDailyClosureOverview(data: {
    grossRevenue: unknown
    netRevenue: unknown
    ordersCount: number
    averageOrderValueGross: unknown
    averageOrderValueNet: unknown
    refundAmount: unknown
    voidAmount: unknown
}): DailyClosureOverviewDTO {
    return {
        grossRevenue: parseMoney(data.grossRevenue),
        netRevenue: parseMoney(data.netRevenue),
        ordersCount: data.ordersCount,
        averageOrderValueGross: parseMoney(data.averageOrderValueGross),
        averageOrderValueNet: parseMoney(data.averageOrderValueNet),
        refundAmount: parseMoney(data.refundAmount),
        voidAmount: parseMoney(data.voidAmount),
    }
}

/**
 * 序列化日结调整
 */
export function serializeDailyClosureAdjustment(data: {
    id: string
    type: string
    amount: unknown
    note: string
    paymentMethod: string | null
    createdAt: Date | string
}): DailyClosureAdjustmentDTO {
    return {
        id: data.id,
        type: data.type,
        amount: parseMoney(data.amount),
        note: data.note,
        paymentMethod: data.paymentMethod,
        createdAt: data.createdAt instanceof Date
            ? data.createdAt.toISOString()
            : String(data.createdAt),
    }
}

/**
 * 序列化日结菜品行
 */
export function serializeDailyClosureItemLine(data: {
    menuItemId: string | null
    name: string
    category: string
    quantitySold: number
    revenueAmount: unknown
    discountImpactAmount: unknown
}): DailyClosureItemLineDTO {
    return {
        menuItemId: data.menuItemId,
        name: data.name,
        category: data.category,
        quantitySold: data.quantitySold,
        revenueAmount: parseMoney(data.revenueAmount),
        discountImpactAmount: data.discountImpactAmount == null
            ? null
            : parseMoney(data.discountImpactAmount),
    }
}
