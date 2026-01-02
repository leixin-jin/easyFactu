/**
 * 交易 Serializer
 * 
 * 将数据库交易数据转换为 API 响应格式
 */

import { parseMoney } from '@/lib/money'

/**
 * 交易 DTO
 */
export interface TransactionDTO {
    id: string
    type: string
    category: string
    amount: number
    description: string | null
    date: string
    paymentMethod: string
    orderId: string | null
    createdAt: string
    tableNumber?: string | null
}

/**
 * 交易明细项 DTO
 */
export interface TransactionItemDTO {
    id: string
    orderItemId: string
    quantity: number
    menuItemId: string
    nameSnapshot: string
    unitPrice: number
    createdAt: string
}

/**
 * 序列化交易
 */
export function serializeTransaction(dbTransaction: {
    id: string
    type: string
    category: string
    amount: unknown
    description: string | null
    date: unknown
    paymentMethod: string
    orderId: string | null
    createdAt: Date
    tableNumber?: string | null
}): TransactionDTO {
    return {
        id: dbTransaction.id,
        type: dbTransaction.type,
        category: dbTransaction.category,
        amount: parseMoney(dbTransaction.amount),
        description: dbTransaction.description,
        date: String(dbTransaction.date),
        paymentMethod: dbTransaction.paymentMethod,
        orderId: dbTransaction.orderId,
        createdAt: dbTransaction.createdAt.toISOString(),
        tableNumber: dbTransaction.tableNumber,
    }
}

/**
 * 序列化交易明细项
 */
export function serializeTransactionItem(dbItem: {
    id: string
    orderItemId: string
    quantity: number
    menuItemId: string
    nameSnapshot: string
    unitPrice: unknown
    createdAt: Date
}): TransactionItemDTO {
    return {
        id: dbItem.id,
        orderItemId: dbItem.orderItemId,
        quantity: dbItem.quantity,
        menuItemId: dbItem.menuItemId,
        nameSnapshot: dbItem.nameSnapshot,
        unitPrice: parseMoney(dbItem.unitPrice),
        createdAt: dbItem.createdAt.toISOString(),
    }
}
