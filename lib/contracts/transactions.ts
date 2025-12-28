/**
 * 交易相关 Schema 定义
 */

import { z } from 'zod'

/**
 * 交易类型
 */
export const transactionTypeSchema = z.enum(['income', 'expense'])
export type TransactionType = z.infer<typeof transactionTypeSchema>

/**
 * 交易查询输入 Schema
 */
export const transactionQueryInputSchema = z.object({
    type: transactionTypeSchema.optional(),
    startDate: z.string().date().optional(),
    endDate: z.string().date().optional(),
    category: z.string().optional(),
    orderId: z.string().uuid().optional(),
})
export type TransactionQueryInput = z.infer<typeof transactionQueryInputSchema>

/**
 * 交易响应 Schema
 */
export const transactionResponseSchema = z.object({
    id: z.string().uuid(),
    type: transactionTypeSchema,
    category: z.string(),
    amount: z.number(),
    description: z.string().nullable(),
    paymentMethod: z.string().nullable(),
    orderId: z.string().uuid().nullable(),
    date: z.string(),
    createdAt: z.string(),
})
export type TransactionResponse = z.infer<typeof transactionResponseSchema>

/**
 * 交易明细项响应 Schema
 */
export const transactionItemResponseSchema = z.object({
    id: z.string().uuid(),
    transactionId: z.string().uuid(),
    orderItemId: z.string().uuid(),
    menuItemId: z.string().uuid(),
    nameSnapshot: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
})
export type TransactionItemResponse = z.infer<typeof transactionItemResponseSchema>
