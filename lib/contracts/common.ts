/**
 * 通用 Schema 定义
 * 
 * 包含分页、ID 参数等通用约束
 */

import { z } from 'zod'

/**
 * ID 参数 Schema
 * 用于路由参数中的 ID 校验
 */
export const idParamSchema = z.object({
    id: z.coerce.number(),
})
export type IdParam = z.infer<typeof idParamSchema>

/**
 * UUID 参数 Schema
 * 用于 UUID 格式的 ID 校验
 */
export const uuidParamSchema = z.object({
    id: z.string().uuid(),
})
export type UuidParam = z.infer<typeof uuidParamSchema>

/**
 * 分页参数 Schema
 */
export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
})
export type Pagination = z.infer<typeof paginationSchema>

/**
 * 排序方向
 */
export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc')
export type SortOrder = z.infer<typeof sortOrderSchema>

/**
 * 日期范围 Schema
 */
export const dateRangeSchema = z.object({
    startDate: z.string().date().optional(),
    endDate: z.string().date().optional(),
})
export type DateRange = z.infer<typeof dateRangeSchema>

/**
 * 金额字段 Schema
 * 支持字符串和数字格式，最多两位小数
 */
const decimalPattern = /^\d+(\.\d{1,2})?$/

/**
 * 检查数值是否最多两位小数
 * 使用 epsilon 比较避免浮点精度问题
 */
function hasAtMostTwoDecimals(value: number): boolean {
    const scaled = value * 100
    const rounded = Math.round(scaled)
    // 使用 epsilon 比较，允许浮点精度误差
    return Math.abs(scaled - rounded) < 0.0001
}

export const moneySchema = z
    .union([
        z
            .string()
            .trim()
            .refine((value) => decimalPattern.test(value), {
                message: '金额必须是数字格式，最多两位小数',
            })
            .transform((value) => Number.parseFloat(value)),
        z.number().refine(
            hasAtMostTwoDecimals,
            { message: '金额最多两位小数' }
        ),
    ])
    .refine((value) => Number.isFinite(value) && value >= 0, {
        message: '金额必须是非负数',
    })

export type Money = z.infer<typeof moneySchema>

