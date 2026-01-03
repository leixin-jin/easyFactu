/**
 * 结账历史服务模块
 *
 * 负责结账历史相关的业务逻辑处理
 */

import 'server-only'

import { and, desc, eq, like } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import type * as schema from '@/db/schema'
import { orders, restaurantTables, transactions } from '@/db/schema'
import { parseMoney } from '@/lib/money'

// 数据库类型定义
type DbClient = NodePgDatabase<typeof schema>

/**
 * 结账历史项
 */
export interface CheckoutHistoryItem {
    transactionId: string
    tableNumber: string | null
    amount: number
    createdAt: string
    orderId: string | null
}

/**
 * 转换日期为 ISO 字符串
 */
function toIsoString(value: unknown): string | null {
    if (value instanceof Date) return value.toISOString()
    if (typeof value === 'string') {
        const parsed = new Date(value)
        return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString()
    }
    return null
}

/**
 * 获取结账历史
 *
 * @param db - 数据库实例
 * @param limit - 返回条数限制
 * @returns 结账历史列表
 */
export async function getCheckoutHistory(
    db: DbClient,
    limit: number = 50
): Promise<CheckoutHistoryItem[]> {
    const rows = await db
        .select({
            transactionId: transactions.id,
            orderId: transactions.orderId,
            amount: transactions.amount,
            createdAt: transactions.createdAt,
            tableNumber: restaurantTables.number,
        })
        .from(transactions)
        .leftJoin(orders, eq(transactions.orderId, orders.id))
        .leftJoin(restaurantTables, eq(orders.tableId, restaurantTables.id))
        .where(and(eq(transactions.type, 'income'), like(transactions.category, 'POS checkout%')))
        .orderBy(desc(transactions.createdAt))
        .limit(limit)

    return rows.map((row) => ({
        transactionId: row.transactionId,
        tableNumber: row.tableNumber ?? null,
        amount: parseMoney(row.amount),
        createdAt: toIsoString(row.createdAt) ?? '',
        orderId: row.orderId ?? null,
    }))
}
