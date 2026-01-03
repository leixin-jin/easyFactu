/**
 * 结账历史 Serializer
 * 
 * 将数据库结账历史数据转换为 API 响应格式
 */

import { parseMoney } from '@/lib/money'

/**
 * 结账历史项 DTO
 */
export interface CheckoutHistoryItemDTO {
    transactionId: string
    tableNumber: string | null
    amount: number
    createdAt: string
    orderId: string | null
}

/**
 * 序列化结账历史项
 */
export function serializeCheckoutHistoryItem(data: {
    transactionId: string
    tableNumber: string | null
    amount: unknown
    createdAt: Date | string
    orderId: string | null
}): CheckoutHistoryItemDTO {
    return {
        transactionId: data.transactionId,
        tableNumber: data.tableNumber,
        amount: parseMoney(data.amount),
        createdAt: data.createdAt instanceof Date
            ? data.createdAt.toISOString()
            : String(data.createdAt),
        orderId: data.orderId,
    }
}
