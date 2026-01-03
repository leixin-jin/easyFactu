/**
 * 订单项更新服务模块
 *
 * 处理订单项数量修改和删除的业务逻辑
 */

import 'server-only'

import { asc, eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import type * as schema from '@/db/schema'
import { menuItems, orderItems, orders } from '@/db/schema'
import { parseMoney, toMoneyString } from '@/lib/money'
import { buildOrderBatches, type OrderItemRow } from '@/lib/order-utils'
import { NotFoundError, ConflictError, ValidationError } from '@/lib/http/errors'

// 数据库类型定义
type DbClient = NodePgDatabase<typeof schema>

/**
 * 订单项更新类型
 */
export type UpdateType = 'decrement' | 'remove'

/**
 * 订单项更新结果
 */
export interface UpdateOrderItemResult {
    order: {
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
    batches: ReturnType<typeof buildOrderBatches>
}

/**
 * 更新订单项（减少数量或删除）
 * 
 * @param db - 数据库实例
 * @param orderItemId - 订单项 ID
 * @param type - 更新类型 ('decrement' | 'remove')
 * @returns 更新结果
 */
export async function updateOrderItem(
    db: DbClient,
    orderItemId: string,
    type: UpdateType
): Promise<UpdateOrderItemResult> {
    return await db.transaction(async (tx) => {
        // 获取订单项
        const [item] = await tx
            .select({
                id: orderItems.id,
                orderId: orderItems.orderId,
                quantity: orderItems.quantity,
                paidQuantity: orderItems.paidQuantity,
                price: orderItems.price,
            })
            .from(orderItems)
            .where(eq(orderItems.id, orderItemId))
            .limit(1)

        if (!item) {
            throw new NotFoundError('订单项', orderItemId)
        }

        // 获取订单
        const [currentOrder] = await tx
            .select()
            .from(orders)
            .where(eq(orders.id, item.orderId))
            .limit(1)

        if (!currentOrder) {
            throw new NotFoundError('订单', item.orderId)
        }

        const priceValue = parseMoney(item.price)
        const existingSubtotal = parseMoney(currentOrder.subtotal)
        const existingDiscount = parseMoney(currentOrder.discount)
        const existingTotalAmount = parseMoney(
            (currentOrder as { totalAmount?: unknown }).totalAmount ??
            (currentOrder as { total?: unknown }).total ??
            0
        )

        const alreadyPaidQty = item.paidQuantity ?? 0
        const availableQty = item.quantity - alreadyPaidQty

        if (availableQty <= 0) {
            throw new ConflictError('Cannot modify item that is already fully paid')
        }

        let newSubtotal = existingSubtotal
        let newTotalAmount = existingTotalAmount

        if (type === 'decrement') {
            // 只能在未结算的数量范围内减一
            if (item.quantity - 1 < alreadyPaidQty) {
                throw new ConflictError('Cannot decrement below paid quantity')
            }

            const newQuantity = item.quantity - 1
            const delta = priceValue
            newSubtotal = existingSubtotal - delta
            newTotalAmount = existingTotalAmount - delta

            await tx
                .update(orderItems)
                .set({ quantity: newQuantity })
                .where(eq(orderItems.id, item.id))
        } else {
            // remove：仅允许尚未结算的菜品整行删除
            if (alreadyPaidQty > 0) {
                throw new ConflictError('Cannot remove item that is already partially or fully paid')
            }

            const delta = priceValue * item.quantity
            newSubtotal = existingSubtotal - delta
            newTotalAmount = existingTotalAmount - delta

            await tx.delete(orderItems).where(eq(orderItems.id, item.id))
        }

        if (newSubtotal < 0) newSubtotal = 0
        if (newTotalAmount < 0) newTotalAmount = 0

        const newTotal = newSubtotal - existingDiscount

        // 更新订单金额
        await tx
            .update(orders)
            .set({
                subtotal: toMoneyString(newSubtotal),
                total: toMoneyString(newTotal),
                totalAmount: toMoneyString(newTotalAmount),
            })
            .where(eq(orders.id, currentOrder.id))

        // 获取更新后的订单项列表
        const rows: OrderItemRow[] = await tx
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
            .where(eq(orderItems.orderId, currentOrder.id))
            .orderBy(asc(orderItems.batchNo), asc(orderItems.createdAt))

        const batches = buildOrderBatches(rows, { omitFullyPaid: true })

        return {
            order: {
                id: currentOrder.id,
                tableId: currentOrder.tableId,
                status: currentOrder.status,
                subtotal: newSubtotal,
                discount: existingDiscount,
                total: newTotal,
                totalAmount: newTotalAmount,
                paidAmount: parseMoney((currentOrder as { paidAmount?: unknown }).paidAmount),
                paymentMethod: currentOrder.paymentMethod ?? null,
                createdAt: currentOrder.createdAt.toISOString(),
                closedAt: currentOrder.closedAt
                    ? currentOrder.closedAt.toISOString()
                    : null,
            },
            batches,
        }
    })
}
