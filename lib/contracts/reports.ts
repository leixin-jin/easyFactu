/**
 * 报表相关 Schema 定义
 */

import { z } from 'zod'

/**
 * 报表类型
 */
export const reportTypeSchema = z.enum(['daily', 'weekly', 'monthly', 'custom'])
export type ReportType = z.infer<typeof reportTypeSchema>

/**
 * 报表查询输入 Schema
 */
export const reportQueryInputSchema = z.object({
    type: reportTypeSchema.default('daily'),
    startDate: z.string().date().optional(),
    endDate: z.string().date().optional(),
})
export type ReportQueryInput = z.infer<typeof reportQueryInputSchema>

/**
 * 销售摘要响应 Schema
 */
export const salesSummaryResponseSchema = z.object({
    totalRevenue: z.number(),
    totalOrders: z.number(),
    totalTransactions: z.number(),
    averageOrderValue: z.number(),
    paymentMethodBreakdown: z.record(z.string(), z.number()),
})
export type SalesSummaryResponse = z.infer<typeof salesSummaryResponseSchema>

/**
 * 商品销售排行响应 Schema
 */
export const itemSalesResponseSchema = z.object({
    menuItemId: z.string().uuid(),
    name: z.string(),
    category: z.string(),
    quantity: z.number(),
    revenue: z.number(),
})
export type ItemSalesResponse = z.infer<typeof itemSalesResponseSchema>

/**
 * 日结报告响应 Schema
 */
export const dailyClosureResponseSchema = z.object({
    id: z.string().uuid(),
    closureNumber: z.number(),
    periodStart: z.string(),
    periodEnd: z.string(),
    totalRevenue: z.number(),
    totalOrders: z.number(),
    cashTotal: z.number(),
    cardTotal: z.number(),
    otherTotal: z.number(),
    createdAt: z.string(),
})
export type DailyClosureResponse = z.infer<typeof dailyClosureResponseSchema>
