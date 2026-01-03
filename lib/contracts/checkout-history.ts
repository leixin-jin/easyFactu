/**
 * 结账历史相关 Schema 定义
 */

import { z } from 'zod'

/**
 * 结账历史查询参数 Schema
 */
export const checkoutHistoryQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(200).optional().default(50),
})
export type CheckoutHistoryQuery = z.infer<typeof checkoutHistoryQuerySchema>

/**
 * 结账历史项响应 Schema
 */
export const checkoutHistoryItemSchema = z.object({
    transactionId: z.string().uuid(),
    tableNumber: z.string().nullable(),
    amount: z.number(),
    createdAt: z.string(),
    orderId: z.string().uuid().nullable(),
})
export type CheckoutHistoryItem = z.infer<typeof checkoutHistoryItemSchema>
