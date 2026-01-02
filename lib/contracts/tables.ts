/**
 * 桌台相关 Schema 定义
 */

import { z } from 'zod'

function optionalTrimmedStringToNull(maxLength: number) {
    return z
        .string()
        .trim()
        .max(maxLength)
        .optional()
        .transform((value) => {
            if (value === undefined) return undefined
            return value.length > 0 ? value : null
        })
}

/**
 * 桌台状态
 * 注：仅支持 idle 和 occupied，与数据库 table_status 枚举保持一致
 */
export const tableStatusSchema = z.enum(['idle', 'occupied'])
export type TableStatus = z.infer<typeof tableStatusSchema>

/**
 * 创建桌台输入 Schema
 */
export const createTableInputSchema = z.object({
    number: z.string().trim().min(1, '桌号不能为空').max(50),
    area: optionalTrimmedStringToNull(50),
    capacity: z.coerce.number().int().min(1, '容量至少为 1').max(200),
})
export type CreateTableInput = z.infer<typeof createTableInputSchema>

/**
 * 更新桌台输入 Schema
 */
export const updateTableInputSchema = z.object({
    number: z.string().trim().min(1).max(50).optional(),
    area: optionalTrimmedStringToNull(50),
    capacity: z.coerce.number().int().min(1).max(200).optional(),
    status: tableStatusSchema.optional(),
    currentGuests: z.coerce.number().int().min(0).optional(),
})
export type UpdateTableInput = z.infer<typeof updateTableInputSchema>

/**
 * 更新桌台状态输入 Schema
 */
export const updateTableStatusInputSchema = z.object({
    status: tableStatusSchema,
})
export type UpdateTableStatusInput = z.infer<typeof updateTableStatusInputSchema>

/**
 * 桌台响应 Schema
 * 注：currentGuests 为可选，因为列表 API 不返回该字段
 */
export const tableResponseSchema = z.object({
    id: z.string().uuid(),
    number: z.string(),
    area: z.string().nullable(),
    capacity: z.number(),
    status: tableStatusSchema,
    currentGuests: z.number().optional(),
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
