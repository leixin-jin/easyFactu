/**
 * 订单项数据访问模块
 *
 * 提供订单项表的 CRUD 操作
 * 所有数据库访问都必须经过此模块
 */

import 'server-only'

import { asc, eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import { orderItems, menuItems } from '@/db/schema'
import type * as schema from '@/db/schema'
import { toMoneyString } from '@/lib/money'

// 数据库类型定义
type DbClient = NodePgDatabase<typeof schema>
type TxClient = Parameters<Parameters<DbClient['transaction']>[0]>[0]
type DbOrTx = DbClient | TxClient

/**
 * 订单项行数据结构（包含菜品信息）
 */
export interface OrderItemRow {
    id: string
    orderId?: string
    batchNo: number
    quantity: number
    paidQuantity: number | null
    price: string | number | unknown
    notes: string | null
    createdAt: Date
    menuItemId: string
    name: string | null
    nameEn: string | null
}

/**
 * 根据订单 ID 获取订单项列表（包含菜品信息）
 */
export async function getOrderItemsByOrderId(
    db: DbOrTx,
    orderId: string
): Promise<OrderItemRow[]> {
    const rows = await db
        .select({
            id: orderItems.id,
            batchNo: orderItems.batchNo,
            quantity: orderItems.quantity,
            paidQuantity: orderItems.paidQuantity,
            price: orderItems.price,
            notes: orderItems.notes,
            createdAt: orderItems.createdAt,
            menuItemId: orderItems.menuItemId,
            name: menuItems.name,
            nameEn: menuItems.nameEn,
        })
        .from(orderItems)
        .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
        .where(eq(orderItems.orderId, orderId))
        .orderBy(asc(orderItems.batchNo), asc(orderItems.createdAt))

    return rows
}

/**
 * 根据 ID 获取单个订单项
 */
export async function getOrderItemById(
    db: DbOrTx,
    id: string
) {
    const [item] = await db
        .select({
            id: orderItems.id,
            orderId: orderItems.orderId,
            quantity: orderItems.quantity,
            paidQuantity: orderItems.paidQuantity,
            price: orderItems.price,
        })
        .from(orderItems)
        .where(eq(orderItems.id, id))
        .limit(1)

    return item ?? null
}

/**
 * 更新订单项已付数量
 */
export async function updateOrderItemPaidQuantity(
    db: DbOrTx,
    itemId: string,
    paidQuantity: number
) {
    await db
        .update(orderItems)
        .set({ paidQuantity })
        .where(eq(orderItems.id, itemId))
}

/**
 * 更新订单项数量
 */
export async function updateOrderItemQuantity(
    db: DbOrTx,
    itemId: string,
    quantity: number
) {
    await db
        .update(orderItems)
        .set({ quantity })
        .where(eq(orderItems.id, itemId))
}

/**
 * 删除订单项
 */
export async function deleteOrderItem(
    db: DbOrTx,
    itemId: string
) {
    await db
        .delete(orderItems)
        .where(eq(orderItems.id, itemId))
}

/**
 * 批量添加订单项
 */
export async function addOrderItems(
    db: DbOrTx,
    orderId: string,
    items: Array<{
        menuItemId: string
        quantity: number
        price: number
        notes?: string | null
        batchNo: number
    }>
) {
    if (items.length === 0) return

    await db.insert(orderItems).values(
        items.map((item) => ({
            orderId,
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            price: toMoneyString(item.price),
            notes: item.notes ?? null,
            batchNo: item.batchNo,
        }))
    )
}
