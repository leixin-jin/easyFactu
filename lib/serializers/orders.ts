/**
 * 订单 Serializer
 * 
 * 将数据库订单数据转换为 API 响应格式
 */

import { parseMoney } from '@/lib/money'

/**
 * 订单 DTO
 */
export interface OrderDTO {
    id: string
    tableId: string | null
    status: string
    subtotal: number
    discount: number
    total: number
    totalAmount: number
    paidAmount: number
    paymentMethod: string | null
    createdAt: string
    closedAt: string | null
}

/**
 * 订单项 DTO
 */
export interface OrderItemDTO {
    id: string
    menuItemId: string
    name: string | null
    nameEn: string | null
    quantity: number
    paidQuantity: number
    price: number
    notes: string | null
    batchNo: number
    createdAt: string
}

/**
 * 订单批次视图
 */
export interface OrderBatchDTO {
    batchNo: number
    items: OrderItemDTO[]
}

/**
 * 结账结果 DTO
 * 注：包含 batches 以匹配服务层返回格式
 */
export interface CheckoutResultDTO {
    order: OrderDTO
    batches: OrderBatchDTO[]
    transaction: TransactionDTO | null
    table: {
        id: string
        number: string
    }
    meta: {
        mode: 'full' | 'aa'
        receivedAmount: number
        changeAmount: number
    }
}

/**
 * 交易 DTO
 */
export interface TransactionDTO {
    id: string
    type: string
    category: string
    amount: number
    paymentMethod: string
    orderId: string | null
    date: string
    createdAt: string
}

/**
 * 序列化订单
 */
export function serializeOrder(dbOrder: {
    id: string
    tableId: string | null
    status: string
    subtotal: unknown
    discount: unknown
    total: unknown
    totalAmount?: unknown
    paidAmount?: unknown
    paymentMethod: string | null
    createdAt: Date
    closedAt: Date | null
}): OrderDTO {
    return {
        id: dbOrder.id,
        tableId: dbOrder.tableId,
        status: dbOrder.status,
        subtotal: parseMoney(dbOrder.subtotal),
        discount: parseMoney(dbOrder.discount),
        total: parseMoney(dbOrder.total),
        totalAmount: parseMoney(dbOrder.totalAmount),
        paidAmount: parseMoney(dbOrder.paidAmount),
        paymentMethod: dbOrder.paymentMethod,
        createdAt: dbOrder.createdAt.toISOString(),
        closedAt: dbOrder.closedAt ? dbOrder.closedAt.toISOString() : null,
    }
}

/**
 * 序列化订单项
 */
export function serializeOrderItem(dbItem: {
    id: string
    menuItemId: string
    name: string | null
    nameEn?: string | null
    quantity: number
    paidQuantity: number | null
    price: unknown
    notes: string | null
    batchNo: number
    createdAt: Date
}): OrderItemDTO {
    return {
        id: dbItem.id,
        menuItemId: dbItem.menuItemId,
        name: dbItem.name,
        nameEn: dbItem.nameEn ?? null,
        quantity: dbItem.quantity,
        paidQuantity: dbItem.paidQuantity ?? 0,
        price: parseMoney(dbItem.price),
        notes: dbItem.notes,
        batchNo: dbItem.batchNo,
        createdAt: dbItem.createdAt.toISOString(),
    }
}
