/**
 * 订单数据访问模块
 *
 * 提供订单表的 CRUD 操作
 * 所有数据库访问都必须经过此模块
 */

import 'server-only'

import { and, asc, eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import { orders, restaurantTables } from '@/db/schema'
import type * as schema from '@/db/schema'
import { toMoneyString } from '@/lib/money'

// 数据库类型定义
type DbClient = NodePgDatabase<typeof schema>
type TxClient = Parameters<Parameters<DbClient['transaction']>[0]>[0]
type DbOrTx = DbClient | TxClient

/**
 * 根据 ID 获取订单
 */
export async function getOrderById(
    db: DbOrTx,
    orderId: string
) {
    const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1)

    return order ?? null
}

/**
 * 根据桌台 ID 获取打开的订单
 */
export async function getOpenOrderByTableId(
    db: DbOrTx,
    tableId: string
) {
    const [order] = await db
        .select()
        .from(orders)
        .where(and(eq(orders.tableId, tableId), eq(orders.status, 'open')))
        .orderBy(asc(orders.createdAt))
        .limit(1)

    return order ?? null
}

/**
 * 根据桌台和订单 ID 获取订单
 */
export async function getOrderByTableAndId(
    db: DbOrTx,
    tableId: string,
    orderId: string
) {
    const [order] = await db
        .select()
        .from(orders)
        .where(and(eq(orders.id, orderId), eq(orders.tableId, tableId)))
        .limit(1)

    return order ?? null
}

/**
 * 更新订单状态
 */
export async function updateOrderStatus(
    db: DbOrTx,
    orderId: string,
    data: {
        status: 'open' | 'paid' | 'cancelled'
        subtotal?: string
        discount?: string
        total?: string
        totalAmount?: string
        paidAmount?: string
        paymentMethod?: string | null
        closedAt?: Date | null
    }
) {
    const [updated] = await db
        .update(orders)
        .set(data)
        .where(eq(orders.id, orderId))
        .returning()

    return updated
}

/**
 * 创建新订单
 */
export async function createOrder(
    db: DbOrTx,
    data: {
        tableId: string
        status?: 'open' | 'paid' | 'cancelled'
        subtotal?: number
        discount?: number
        total?: number
        totalAmount?: number
        paidAmount?: number
        paymentMethod?: string | null
    }
) {
    const [created] = await db
        .insert(orders)
        .values({
            tableId: data.tableId,
            status: data.status ?? 'open',
            paymentMethod: data.paymentMethod ?? null,
            subtotal: toMoneyString(data.subtotal ?? 0),
            discount: toMoneyString(data.discount ?? 0),
            total: toMoneyString(data.total ?? 0),
            totalAmount: toMoneyString(data.totalAmount ?? 0),
            paidAmount: toMoneyString(data.paidAmount ?? 0),
        })
        .returning()

    return created
}

/**
 * 更新桌台状态（订单相关操作常需要同步更新桌台）
 */
export async function updateTableAfterCheckout(
    db: DbOrTx,
    tableId: string,
    data: {
        status: 'idle' | 'occupied'
        amount: string
        currentGuests?: number
        startedAt?: Date | null
    }
) {
    await db
        .update(restaurantTables)
        .set(data)
        .where(eq(restaurantTables.id, tableId))
}
