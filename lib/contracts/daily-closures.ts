/**
 * 日结相关 Schema 定义
 */

import { z } from 'zod'

/**
 * 日结确认输入 Schema
 */
export const confirmClosureInputSchema = z.object({
    taxRate: z.number().finite().min(0).max(1).optional(),
    adjustments: z
        .array(
            z.object({
                type: z.enum(['fee', 'rounding', 'other']),
                amount: z.number().finite(),
                note: z.string().min(1),
                paymentMethod: z.string().min(1).optional().nullable(),
            })
        )
        .optional(),
})
export type ConfirmClosureInput = z.infer<typeof confirmClosureInputSchema>

/**
 * 日结调整输入 Schema
 */
export const closureAdjustmentInputSchema = z.object({
    type: z.enum(['fee', 'rounding', 'other']),
    amount: z.number().finite(),
    note: z.string().min(1),
    paymentMethod: z.string().min(1).optional().nullable(),
})
export type ClosureAdjustmentInput = z.infer<typeof closureAdjustmentInputSchema>

/**
 * 日结导出格式 Schema
 */
export const closureExportFormatSchema = z.enum(['pdf', 'xlsx'])
export type ClosureExportFormat = z.infer<typeof closureExportFormatSchema>

/**
 * 日结导出查询参数 Schema
 */
export const closureExportQuerySchema = z.object({
    format: closureExportFormatSchema,
})
export type ClosureExportQuery = z.infer<typeof closureExportQuerySchema>
