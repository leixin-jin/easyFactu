/**
 * 订单清空服务模块
 *
 * 处理清空桌台订单的业务逻辑
 */

import 'server-only'

import { and, eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import type * as schema from '@/db/schema'
import { orderItems, orders, restaurantTables } from '@/db/schema'
import { NotFoundError } from '@/lib/http/errors'

// 数据库类型定义
type DbClient = NodePgDatabase<typeof schema>

/**
 * 清空结果
 */
export interface ClearResult {
    order: null
    batches: []
}

/**
 * 清空桌台订单
 * 
 * @param db - 数据库实例
 * @param tableId - 桌台 ID
 * @returns 清空结果
 */
export async function clearTableOrder(
    db: DbClient,
    tableId: string
): Promise<ClearResult> {
    return await db.transaction(async (tx) => {
        // 验证桌台是否存在
        const [table] = await tx
            .select({ id: restaurantTables.id })
            .from(restaurantTables)
            .where(eq(restaurantTables.id, tableId))
            .limit(1)

        if (!table) {
            throw new NotFoundError('桌台', tableId)
        }

        // 获取当前打开的订单
        const [currentOrder] = await tx
            .select()
            .from(orders)
            .where(and(eq(orders.tableId, tableId), eq(orders.status, 'open')))
            .limit(1)

        if (currentOrder) {
            // 删除订单项
            await tx
                .delete(orderItems)
                .where(eq(orderItems.orderId, currentOrder.id))

            // 更新订单状态为已取消
            await tx
                .update(orders)
                .set({
                    status: 'cancelled',
                    subtotal: '0',
                    total: '0',
                    discount: currentOrder.discount != null ? currentOrder.discount : '0',
                    totalAmount: '0',
                    paidAmount: '0',
                    closedAt: new Date(),
                })
                .where(eq(orders.id, currentOrder.id))
        }

        // 重置桌台状态
        await tx
            .update(restaurantTables)
            .set({ status: 'idle', amount: '0' })
            .where(eq(restaurantTables.id, tableId))

        return {
            order: null,
            batches: [],
        }
    })
}
