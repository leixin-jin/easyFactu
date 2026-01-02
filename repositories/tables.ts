/**
 * 桌台数据访问模块
 *
 * 提供桌台表的 CRUD 操作
 * 所有数据库访问都必须经过此模块
 */

import 'server-only'

import { eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import { restaurantTables } from '@/db/schema'
import type * as schema from '@/db/schema'

// 数据库类型定义
type DbClient = NodePgDatabase<typeof schema>
type TxClient = Parameters<Parameters<DbClient['transaction']>[0]>[0]
type DbOrTx = DbClient | TxClient

/**
 * 根据 ID 获取桌台
 */
export async function getTableById(
    db: DbOrTx,
    tableId: string
) {
    const [table] = await db
        .select({
            id: restaurantTables.id,
            number: restaurantTables.number,
            status: restaurantTables.status,
            area: restaurantTables.area,
            capacity: restaurantTables.capacity,
            currentGuests: restaurantTables.currentGuests,
            startedAt: restaurantTables.startedAt,
            amount: restaurantTables.amount,
        })
        .from(restaurantTables)
        .where(eq(restaurantTables.id, tableId))
        .limit(1)

    return table ?? null
}

/**
 * 更新桌台状态
 */
export async function updateTableStatus(
    db: DbOrTx,
    tableId: string,
    data: {
        status: 'idle' | 'occupied'
        amount?: string
        currentGuests?: number
        startedAt?: Date | null
    }
) {
    const [updated] = await db
        .update(restaurantTables)
        .set(data)
        .where(eq(restaurantTables.id, tableId))
        .returning()

    return updated
}

/**
 * 获取所有桌台
 */
export async function getAllTables(db: DbOrTx) {
    return await db.select().from(restaurantTables)
}

/**
 * 创建桌台
 */
export async function createTable(
    db: DbOrTx,
    data: {
        number: string
        area?: string
        capacity?: number
    }
) {
    const [created] = await db
        .insert(restaurantTables)
        .values(data)
        .returning()

    return created
}

/**
 * 更新桌台信息
 */
export async function updateTable(
    db: DbOrTx,
    tableId: string,
    data: {
        number?: string
        area?: string
        capacity?: number
    }
) {
    const [updated] = await db
        .update(restaurantTables)
        .set(data)
        .where(eq(restaurantTables.id, tableId))
        .returning()

    return updated
}

/**
 * 删除桌台
 */
export async function deleteTable(
    db: DbOrTx,
    tableId: string
) {
    await db
        .delete(restaurantTables)
        .where(eq(restaurantTables.id, tableId))
}

/**
 * 重置桌台状态（结账后）
 */
export async function resetTableToIdle(
    db: DbOrTx,
    tableId: string
) {
    await db
        .update(restaurantTables)
        .set({
            status: 'idle',
            amount: '0',
            currentGuests: 0,
            startedAt: null,
        })
        .where(eq(restaurantTables.id, tableId))
}
