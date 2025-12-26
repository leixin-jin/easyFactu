/**
 * 订单相关 Schema 定义
 */

import { z } from 'zod'

// 注意：此文件定义的 schema 可直接使用 z.number() 进行金额校验
// 如需复用 moneySchema，请在实际使用时导入

/**
 * 支付模式
 */
export const paymentModeSchema = z.enum(['full', 'aa'])
export type PaymentMode = z.infer<typeof paymentModeSchema>

/**
 * 支付方式
 */
export const paymentMethodSchema = z.enum(['cash', 'card', 'transfer', 'other'])
export type PaymentMethod = z.infer<typeof paymentMethodSchema>

/**
 * 订单状态
 */
export const orderStatusSchema = z.enum(['open', 'paid', 'cancelled'])
export type OrderStatus = z.infer<typeof orderStatusSchema>

/**
 * 结账商品项
 */
export const checkoutItemSchema = z.object({
    menuItemId: z.string().uuid(),
    quantity: z.number().int().positive(),
    price: z.number().nonnegative(),
})
export type CheckoutItem = z.infer<typeof checkoutItemSchema>

/**
 * 结账输入 Schema
 */
export const checkoutInputSchema = z.object({
    tableId: z.string().uuid(),
    orderId: z.string().uuid(),
    mode: paymentModeSchema.default('full'),
    paymentMethod: z.string().min(1),
    discountPercent: z.number().min(0).max(100).optional().default(0),
    clientSubtotal: z.number().nonnegative(),
    clientTotal: z.number().nonnegative(),
    receivedAmount: z.number().nonnegative().optional(),
    changeAmount: z.number().nonnegative().optional(),
    aaItems: z.array(checkoutItemSchema).optional(),
})
export type CheckoutInput = z.infer<typeof checkoutInputSchema>

/**
 * 创建订单项输入
 */
export const createOrderItemInputSchema = z.object({
    menuItemId: z.string().uuid(),
    quantity: z.number().int().positive(),
})
export type CreateOrderItemInput = z.infer<typeof createOrderItemInputSchema>

/**
 * 创建订单输入 Schema
 */
export const createOrderInputSchema = z.object({
    tableId: z.string().uuid(),
    items: z.array(createOrderItemInputSchema).min(1),
})
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>

/**
 * 更新订单输入 Schema
 */
export const updateOrderInputSchema = z.object({
    items: z.array(createOrderItemInputSchema).optional(),
    status: orderStatusSchema.optional(),
})
export type UpdateOrderInput = z.infer<typeof updateOrderInputSchema>

/**
 * 订单响应 Schema（用于序列化）
 */
export const orderResponseSchema = z.object({
    id: z.string().uuid(),
    tableId: z.string().uuid(),
    status: orderStatusSchema,
    subtotal: z.number(),
    discount: z.number(),
    total: z.number(),
    totalAmount: z.number(),
    paidAmount: z.number(),
    paymentMethod: z.string().nullable(),
    createdAt: z.string(),
    closedAt: z.string().nullable(),
})
export type OrderResponse = z.infer<typeof orderResponseSchema>
