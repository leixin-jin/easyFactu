/**
 * 桌台相关 Schema 定义
 */

import { z } from 'zod'

/**
 * 桌台状态
 */
export const tableStatusSchema = z.enum(['idle', 'occupied', 'reserved'])
export type TableStatus = z.infer<typeof tableStatusSchema>

/**
 * 创建桌台输入 Schema
 */
export const createTableInputSchema = z.object({
    number: z.string().trim().min(1, '桌号不能为空').max(50),
    area: z
        .string()
        .trim()
        .max(50)
        .optional()
        .transform((value) => (value && value.length > 0 ? value : null)),
    capacity: z.coerce.number().int().min(1, '容量至少为 1').max(200),
})
export type CreateTableInput = z.infer<typeof createTableInputSchema>

/**
 * 更新桌台输入 Schema
 */
export const updateTableInputSchema = z.object({
    number: z.string().trim().min(1).max(50).optional(),
    area: z
        .string()
        .trim()
        .max(50)
        .optional()
        .transform((value) => (value && value.length > 0 ? value : null)),
    capacity: z.coerce.number().int().min(1).max(200).optional(),
    status: tableStatusSchema.optional(),
    currentGuests: z.coerce.number().int().min(0).optional(),
})
export type UpdateTableInput = z.infer<typeof updateTableInputSchema>

/**
 * 桌台响应 Schema
 */
export const tableResponseSchema = z.object({
    id: z.string().uuid(),
    number: z.string(),
    area: z.string().nullable(),
    capacity: z.number(),
    status: tableStatusSchema,
    currentGuests: z.number(),
    amount: z.number().nullable(),
})
export type TableResponse = z.infer<typeof tableResponseSchema>

/**
 * 桌台转移输入 Schema
 */
export const transferTableInputSchema = z.object({
    fromTableId: z.string().uuid(),
    toTableId: z.string().uuid(),
})
export type TransferTableInput = z.infer<typeof transferTableInputSchema>

/**
 * 合并桌台输入 Schema
 */
export const mergeTablesInputSchema = z.object({
    sourceTableIds: z.array(z.string().uuid()).min(1),
    targetTableId: z.string().uuid(),
})
export type MergeTablesInput = z.infer<typeof mergeTablesInputSchema>

/**
 * 拆分桌台输入 Schema
 */
export const splitTableInputSchema = z.object({
    sourceTableId: z.string().uuid(),
    targetTableId: z.string().uuid(),
    items: z.array(
        z.object({
            orderItemId: z.string().uuid(),
            quantity: z.number().int().positive(),
        })
    ),
})
export type SplitTableInput = z.infer<typeof splitTableInputSchema>
