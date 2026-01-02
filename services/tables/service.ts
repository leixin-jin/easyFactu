/**
 * 桌台服务模块
 *
 * 负责桌台相关的业务逻辑处理
 */

import 'server-only'

import { and, eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import type * as schema from '@/db/schema'
import { orders, restaurantTables } from '@/db/schema'
import { parseMoney } from '@/lib/money'
import { AppError, NotFoundError, ConflictError } from '@/lib/http/errors'
import type { CreateTableInput, UpdateTableInput } from '@/lib/contracts/tables'

// 数据库类型定义
type DbClient = NodePgDatabase<typeof schema>

/**
 * 桌台响应类型
 */
export interface TableResponse {
    id: string
    number: string
    capacity: number
    status: string
    area: string | null
    amount: number | null
}

/**
 * 获取所有桌台（包含待付金额）
 */
export async function getAllTables(db: DbClient): Promise<TableResponse[]> {
    const rows = await db
        .select({
            id: restaurantTables.id,
            number: restaurantTables.number,
            capacity: restaurantTables.capacity,
            status: restaurantTables.status,
            area: restaurantTables.area,
            orderTotalAmount: orders.totalAmount,
            orderPaidAmount: orders.paidAmount,
        })
        .from(restaurantTables)
        .leftJoin(
            orders,
            and(eq(orders.tableId, restaurantTables.id), eq(orders.status, 'open'))
        )

    return rows.map((row) => {
        const totalAmount = parseMoney(row.orderTotalAmount)
        const paidAmount = parseMoney(row.orderPaidAmount)
        const outstanding = Math.max(0, totalAmount - paidAmount)

        return {
            id: row.id,
            number: row.number,
            capacity: row.capacity,
            status: row.status,
            area: row.area,
            amount: outstanding || null,
        }
    })
}

/**
 * 获取单个桌台
 */
export async function getTableById(db: DbClient, id: string) {
    const [table] = await db
        .select()
        .from(restaurantTables)
        .where(eq(restaurantTables.id, id))
        .limit(1)

    if (!table) {
        throw new NotFoundError('桌台', id)
    }

    return {
        id: table.id,
        number: table.number,
        capacity: table.capacity,
        status: table.status,
        area: table.area,
        amount: parseMoney(table.amount),
    }
}

/**
 * 创建桌台
 */
export async function createTable(db: DbClient, input: CreateTableInput) {
    const { number, area, capacity } = input

    // 检查桌号是否已存在
    const [existing] = await db
        .select({ id: restaurantTables.id })
        .from(restaurantTables)
        .where(eq(restaurantTables.number, number))
        .limit(1)

    if (existing) {
        throw new ConflictError('桌号已存在')
    }

    const [created] = await db
        .insert(restaurantTables)
        .values({
            number,
            area,
            capacity,
            status: 'idle',
            currentGuests: 0,
            amount: '0',
        })
        .returning({
            id: restaurantTables.id,
            number: restaurantTables.number,
            area: restaurantTables.area,
            capacity: restaurantTables.capacity,
            status: restaurantTables.status,
        })

    return created
}

/**
 * 更新桌台
 */
export async function updateTable(
    db: DbClient,
    id: string,
    input: UpdateTableInput
) {
    // 检查桌台是否存在
    const [existing] = await db
        .select()
        .from(restaurantTables)
        .where(eq(restaurantTables.id, id))
        .limit(1)

    if (!existing) {
        throw new NotFoundError('桌台', id)
    }

    // 构建更新数据
    const updateData: Partial<typeof restaurantTables.$inferInsert> = {}
    if (input.number !== undefined) updateData.number = input.number
    if (input.area !== undefined) updateData.area = input.area
    if (input.capacity !== undefined) updateData.capacity = input.capacity

    updateData.updatedAt = new Date()

    const [updated] = await db
        .update(restaurantTables)
        .set(updateData)
        .where(eq(restaurantTables.id, id))
        .returning()

    return {
        id: updated.id,
        number: updated.number,
        capacity: updated.capacity,
        status: updated.status,
        area: updated.area,
        amount: parseMoney(updated.amount),
    }
}

/**
 * 更新桌台状态
 */
export async function updateTableStatus(
    db: DbClient,
    id: string,
    status: string
) {
    const [updated] = await db
        .update(restaurantTables)
        .set({ status })
        .where(eq(restaurantTables.id, id))
        .returning({
            id: restaurantTables.id,
            number: restaurantTables.number,
            status: restaurantTables.status,
            area: restaurantTables.area,
            capacity: restaurantTables.capacity,
        })

    if (!updated) {
        throw new NotFoundError('桌台', id)
    }

    return updated
}

/**
 * 删除桌台
 */
export async function deleteTable(db: DbClient, id: string) {
    const [existing] = await db
        .select()
        .from(restaurantTables)
        .where(eq(restaurantTables.id, id))
        .limit(1)

    if (!existing) {
        throw new NotFoundError('桌台', id)
    }

    // 检查是否有打开的订单
    const [openOrder] = await db
        .select({ id: orders.id })
        .from(orders)
        .where(and(eq(orders.tableId, id), eq(orders.status, 'open')))
        .limit(1)

    if (openOrder) {
        throw new AppError('TABLE_HAS_OPEN_ORDER', 409, 'Table has open order')
    }

    const [deleted] = await db
        .delete(restaurantTables)
        .where(eq(restaurantTables.id, id))
        .returning({
            id: restaurantTables.id,
            number: restaurantTables.number,
        })

    if (!deleted) {
        throw new NotFoundError('桌台', id)
    }

    return deleted
}
