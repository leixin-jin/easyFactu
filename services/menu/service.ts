/**
 * 菜单服务模块
 *
 * 负责菜单相关的业务逻辑处理
 */

import 'server-only'

import { and, desc, eq, ne } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import type * as schema from '@/db/schema'
import { menuItems } from '@/db/schema'
import { toMoneyString, parseMoney } from '@/lib/money'
import { NotFoundError, ConflictError } from '@/lib/http/errors'
import type { CreateMenuItemInput, UpdateMenuItemInput } from '@/lib/contracts/menu'

// 数据库类型定义
type DbClient = NodePgDatabase<typeof schema>

/**
 * 菜品响应类型
 */
export interface MenuItemResponse {
    id: string
    name: string
    nameEn: string
    category: string
    price: number
    description: string | null
    image: string | null
    available: boolean
    createdAt: string
    updatedAt: string
}

/**
 * 将数据库菜品转换为响应格式
 */
export function toMenuItemResponse(row: typeof menuItems.$inferSelect): MenuItemResponse {
    return {
        id: row.id,
        name: row.name,
        nameEn: row.nameEn ?? '',
        category: row.category,
        price: parseMoney(row.price),
        description: row.description ?? null,
        image: row.image ?? null,
        available: row.available,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    }
}

/**
 * 构建分类列表
 */
function buildCategories(items: MenuItemResponse[]) {
    const counts = new Map<string, number>()
    for (const item of items) {
        counts.set(item.category, (counts.get(item.category) ?? 0) + 1)
    }

    return [
        { id: 'all', name: '全部菜品', count: items.length },
        ...Array.from(counts.entries()).map(([id, count]) => ({
            id,
            name: id,
            count,
        })),
    ]
}

/**
 * 获取所有可用菜品
 */
export async function getAllMenuItems(db: DbClient) {
    const rows = await db
        .select()
        .from(menuItems)
        .where(eq(menuItems.available, true))

    const items = rows.map(toMenuItemResponse)
    const categories = buildCategories(items)

    return { categories, items }
}

/**
 * 获取单个菜品
 */
export async function getMenuItemById(db: DbClient, id: string) {
    const [item] = await db
        .select()
        .from(menuItems)
        .where(eq(menuItems.id, id))
        .limit(1)

    if (!item) {
        throw new NotFoundError('菜品', id)
    }

    return toMenuItemResponse(item)
}

/**
 * 创建菜品
 */
export async function createMenuItem(db: DbClient, input: CreateMenuItemInput) {
    const { name, nameEn, category, price, description, image } = input

    // 检查重复
    const [duplicate] = await db
        .select({ id: menuItems.id })
        .from(menuItems)
        .where(
            and(
                eq(menuItems.name, name),
                eq(menuItems.category, category),
                eq(menuItems.available, true),
                ne(menuItems.id, id)
            )
        )
        .limit(1)

    if (duplicate) {
        throw new ConflictError('该分类下已存在同名菜品')
    }

    const [created] = await db
        .insert(menuItems)
        .values({
            name,
            nameEn,
            category,
            price: toMoneyString(price),
            description,
            image,
        })
        .returning()

    if (!created) {
        throw new Error('创建菜品失败')
    }

    return toMenuItemResponse(created)
}

/**
 * 更新菜品
 */
export async function updateMenuItem(
    db: DbClient,
    id: string,
    input: UpdateMenuItemInput
) {
    // 检查菜品是否存在
    const [existing] = await db
        .select()
        .from(menuItems)
        .where(eq(menuItems.id, id))
        .limit(1)

    if (!existing || existing.available === false) {
        throw new NotFoundError('菜品', id)
    }

    // 构建更新数据
    const updateData: Partial<typeof menuItems.$inferInsert> = {}
    if (input.name !== undefined) updateData.name = input.name
    if (input.nameEn !== undefined) updateData.nameEn = input.nameEn
    if (input.category !== undefined) updateData.category = input.category
    if (input.price !== undefined) updateData.price = toMoneyString(input.price)
    if (input.description !== undefined) updateData.description = input.description
    if (input.image !== undefined) updateData.image = input.image
    if (input.available !== undefined) updateData.available = input.available

    updateData.updatedAt = new Date()

    const [updated] = await db
        .update(menuItems)
        .set(updateData)
        .where(eq(menuItems.id, id))
        .returning()

    return toMenuItemResponse(updated)
}

/**
 * 删除菜品（软删除，设置 available = false）
 */
export async function deleteMenuItem(db: DbClient, id: string) {
    const [existing] = await db
        .select()
        .from(menuItems)
        .where(eq(menuItems.id, id))
        .limit(1)

    if (!existing || existing.available === false) {
        throw new NotFoundError('菜品', id)
    }

    const [deleted] = await db
        .update(menuItems)
        .set({ available: false, updatedAt: new Date() })
        .where(eq(menuItems.id, id))
        .returning()

    return toMenuItemResponse(deleted)
}

/**
 * 恢复已删除的菜品
 */
export async function restoreMenuItem(db: DbClient, id: string) {
    const [existing] = await db
        .select()
        .from(menuItems)
        .where(eq(menuItems.id, id))
        .limit(1)

    if (!existing || existing.available === true) {
        throw new NotFoundError('菜品', id)
    }

    const [conflict] = await db
        .select({ id: menuItems.id })
        .from(menuItems)
        .where(
            and(
                eq(menuItems.name, existing.name),
                eq(menuItems.category, existing.category),
                eq(menuItems.available, true)
            )
        )
        .limit(1)

    if (conflict) {
        throw new ConflictError('该分类下已存在同名菜品')
    }

    const [restored] = await db
        .update(menuItems)
        .set({ available: true, updatedAt: new Date() })
        .where(eq(menuItems.id, id))
        .returning()

    return toMenuItemResponse(restored)
}

/**
 * 获取已删除的菜品
 */
export async function getDeletedMenuItems(db: DbClient) {
    const rows = await db
        .select()
        .from(menuItems)
        .where(eq(menuItems.available, false))
        .orderBy(desc(menuItems.updatedAt))

    return rows.map(toMenuItemResponse)
}
