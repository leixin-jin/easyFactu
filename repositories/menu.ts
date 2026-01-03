/**
 * 菜单数据访问模块
 *
 * 提供菜单表的 CRUD 操作
 * 所有数据库访问都必须经过此模块
 */

import 'server-only'

import { eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import { menuItems } from '@/db/schema'
import type * as schema from '@/db/schema'
import { toMoneyString } from '@/lib/money'

// 数据库类型定义
type DbClient = NodePgDatabase<typeof schema>
type TxClient = Parameters<Parameters<DbClient['transaction']>[0]>[0]
type DbOrTx = DbClient | TxClient

/**
 * 根据 ID 获取菜品
 */
export async function getMenuItemById(
    db: DbOrTx,
    id: string
) {
    const [item] = await db
        .select()
        .from(menuItems)
        .where(eq(menuItems.id, id))
        .limit(1)

    return item ?? null
}

/**
 * 获取所有可用菜品
 */
export async function getAvailableMenuItems(db: DbOrTx) {
    return await db
        .select()
        .from(menuItems)
        .where(eq(menuItems.available, true))
}

/**
 * 获取所有菜品（包括不可用的）
 */
export async function getAllMenuItems(db: DbOrTx) {
    return await db.select().from(menuItems)
}

/**
 * 创建菜品
 */
export async function createMenuItem(
    db: DbOrTx,
    data: {
        name: string
        nameEn?: string | null
        category: string
        price: number
        description?: string | null
        image?: string | null
    }
) {
    const [created] = await db
        .insert(menuItems)
        .values({
            name: data.name,
            nameEn: data.nameEn ?? null,
            category: data.category,
            price: toMoneyString(data.price),
            description: data.description ?? null,
            image: data.image ?? null,
        })
        .returning()

    return created
}

/**
 * 更新菜品
 */
export async function updateMenuItem(
    db: DbOrTx,
    id: string,
    data: Partial<{
        name: string
        nameEn: string | null
        category: string
        price: number
        description: string | null
        image: string | null
        available: boolean
    }>
) {
    const updateData: Partial<typeof menuItems.$inferInsert> = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.nameEn !== undefined) updateData.nameEn = data.nameEn
    if (data.category !== undefined) updateData.category = data.category
    if (data.price !== undefined) updateData.price = toMoneyString(data.price)
    if (data.description !== undefined) updateData.description = data.description
    if (data.image !== undefined) updateData.image = data.image
    if (data.available !== undefined) updateData.available = data.available

    updateData.updatedAt = new Date()

    const [updated] = await db
        .update(menuItems)
        .set(updateData)
        .where(eq(menuItems.id, id))
        .returning()

    return updated
}

/**
 * 删除菜品（软删除）
 */
export async function softDeleteMenuItem(
    db: DbOrTx,
    id: string
) {
    await db
        .update(menuItems)
        .set({ available: false, updatedAt: new Date() })
        .where(eq(menuItems.id, id))
}
