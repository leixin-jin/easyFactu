/**
 * 菜单相关 Schema 定义
 */

import { z } from 'zod'

/**
 * 金额正则：数字，最多两位小数
 */
const decimalPattern = /^\d+(\.\d{1,2})?$/

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
 * 菜单项价格 Schema
 */
const priceSchema = z
    .union([
        z
            .string()
            .trim()
            .refine((value) => decimalPattern.test(value), {
                message: '价格必须是数字格式，最多两位小数',
            })
            .transform((value) => Number.parseFloat(value)),
        z.number(),
    ])
    .refine((value) => Number.isFinite(value) && value > 0, {
        message: '价格必须大于 0',
    })
    .refine(
        (value) => {
            const rounded = Math.round(value * 100) / 100
            return Math.abs(rounded - value) < 1e-6
        },
        { message: '价格最多两位小数' }
    )

/**
 * 创建菜单项输入 Schema
 */
export const createMenuItemInputSchema = z.object({
    name: z.string().trim().min(1, '菜品名称不能为空').max(120),
    nameEn: optionalTrimmedStringToNull(120),
    category: z.string().trim().min(1, '分类不能为空').max(120),
    price: priceSchema,
    description: optionalTrimmedStringToNull(500),
    image: optionalTrimmedStringToNull(512),
})
export type CreateMenuItemInput = z.infer<typeof createMenuItemInputSchema>

/**
 * 更新菜单项输入 Schema
 */
export const updateMenuItemInputSchema = z.object({
    name: z.string().trim().min(1).max(120).optional(),
    nameEn: optionalTrimmedStringToNull(120),
    category: z.string().trim().min(1).max(120).optional(),
    price: priceSchema.optional(),
    description: optionalTrimmedStringToNull(500),
    image: optionalTrimmedStringToNull(512),
    available: z.boolean().optional(),
}).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided for update' }
)
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemInputSchema>

/**
 * 菜单项响应 Schema
 */
export const menuItemResponseSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    nameEn: z.string().nullable(),
    category: z.string(),
    price: z.number(),
    description: z.string().nullable(),
    image: z.string().nullable(),
    available: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
})
export type MenuItemResponse = z.infer<typeof menuItemResponseSchema>

/**
 * 分类响应 Schema
 */
export const categoryResponseSchema = z.object({
    id: z.string(),
    name: z.string(),
    count: z.number(),
})
export type CategoryResponse = z.infer<typeof categoryResponseSchema>
