/**
 * 餐厅设置相关 Schema 定义
 */

import { z } from 'zod'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function optionalTrimmedStringToNull(maxLength: number) {
    return z
        .string()
        .max(maxLength)
        .nullable()
        .optional()
        .transform((value) => (value && value.length > 0 ? value : null))
}

/**
 * 餐厅设置更新输入 Schema
 */
export const updateRestaurantSettingsInputSchema = z.object({
    restaurantName: z.string().min(1, '餐厅名称不能为空').max(120),
    address: optionalTrimmedStringToNull(500),
    phone: optionalTrimmedStringToNull(50),
    email: z
        .string()
        .nullable()
        .optional()
        .transform((value) => {
            if (!value || value.length === 0) return null
            return emailRegex.test(value) ? value : null
        }),
    taxRate: z.string().regex(/^\d+(\.\d{1,4})?$/, '请输入有效的税率'),
    currency: z.enum(['EUR', 'USD', 'GBP', 'CNY']),
    businessHours: optionalTrimmedStringToNull(1000),
})
export type UpdateRestaurantSettingsInput = z.infer<typeof updateRestaurantSettingsInputSchema>

/**
 * 餐厅设置响应 Schema
 */
export const restaurantSettingsResponseSchema = z.object({
    id: z.string().uuid(),
    restaurantName: z.string(),
    address: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    taxRate: z.string(),
    currency: z.string(),
    businessHours: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
})
export type RestaurantSettingsResponse = z.infer<typeof restaurantSettingsResponseSchema>
