/**
 * 订单转移服务模块
 *
 * 处理订单项在桌台之间转移的业务逻辑
 */

import 'server-only'

import { and, asc, eq, max } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import type * as schema from '@/db/schema'
import { menuItems, orderItems, orders, restaurantTables } from '@/db/schema'
import { parseMoney, toMoneyString } from '@/lib/money'
import { buildOrderBatches, type OrderItemRow } from '@/lib/order-utils'
import { NotFoundError, ConflictError, ValidationError } from '@/lib/http/errors'

// 数据库类型定义
type DbClient = NodePgDatabase<typeof schema>

/**
 * 转移请求项
 */
export interface TransferItem {
    orderItemId: string
    quantity: number
}

/**
 * 转移输入
 */
export interface TransferInput {
    mode: 'split' | 'merge'
    sourceTableId: string
    targetTableId: string
    items?: TransferItem[]
    moveAll?: boolean
}

/**
 * 订单摘要
 */
interface OrderSummary {
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

/**
 * 转移结果
 */
export interface TransferResult {
    source: {
        tableId: string
        order: OrderSummary | null
        batches: ReturnType<typeof buildOrderBatches>
    }
    target: {
        tableId: string
        order: OrderSummary
        batches: ReturnType<typeof buildOrderBatches>
    }
}

/**
 * 映射订单摘要
 */
function mapOrderSummary(row: typeof orders.$inferSelect | null): OrderSummary | null {
    if (!row) return null
    return {
        id: row.id,
        tableId: row.tableId,
        status: row.status,
        subtotal: parseMoney(row.subtotal),
        discount: parseMoney(row.discount),
        total: parseMoney(row.total),
        totalAmount: parseMoney((row as { totalAmount?: unknown }).totalAmount ?? 0),
        paidAmount: parseMoney((row as { paidAmount?: unknown }).paidAmount ?? 0),
        paymentMethod: row.paymentMethod ?? null,
        createdAt: row.createdAt.toISOString(),
        closedAt: row.closedAt ? row.closedAt.toISOString() : null,
    }
}

/**
 * 计算未结金额
 */
function calculateOutstanding(rows: Array<OrderItemRow & { paidQuantity?: number | null }>) {
    return rows.reduce((sum, row) => {
        const price = parseMoney(row.price)
        const paidQty = row.paidQuantity ?? 0
        const remaining = row.quantity - paidQty
        if (remaining > 0) {
            return sum + price * remaining
        }
        return sum
    }, 0)
}

/**
 * 转移订单项
 * 
 * @param db - 数据库实例
 * @param input - 转移输入
 * @returns 转移结果
 */
export async function transferOrderItems(
    db: DbClient,
    input: TransferInput
): Promise<TransferResult> {
    const { sourceTableId, targetTableId, items = [], moveAll = false } = input

    if (sourceTableId === targetTableId) {
        throw new ValidationError('Source and target tables cannot be the same')
    }

    return await db.transaction(async (tx) => {
        // 获取源桌台和目标桌台
        const [sourceTable] = await tx
            .select({ id: restaurantTables.id, number: restaurantTables.number })
            .from(restaurantTables)
            .where(eq(restaurantTables.id, sourceTableId))
            .limit(1)

        const [targetTable] = await tx
            .select({ id: restaurantTables.id, number: restaurantTables.number })
            .from(restaurantTables)
            .where(eq(restaurantTables.id, targetTableId))
            .limit(1)

        if (!sourceTable || !targetTable) {
            throw new NotFoundError('桌台')
        }

        // 获取源订单
        const [sourceOrder] = await tx
            .select()
            .from(orders)
            .where(and(eq(orders.tableId, sourceTableId), eq(orders.status, 'open')))
            .limit(1)

        if (!sourceOrder) {
            throw new NotFoundError('源桌台没有打开的订单')
        }

        const sourcePaidAmount = parseMoney((sourceOrder as { paidAmount?: unknown }).paidAmount ?? 0)
        if (sourcePaidAmount > 0) {
            throw new ConflictError('Source order has paid items, cannot transfer')
        }

        // 获取源订单项
        const sourceItems = await tx
            .select({
                id: orderItems.id,
                orderId: orderItems.orderId,
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
            .where(eq(orderItems.orderId, sourceOrder.id))
            .orderBy(asc(orderItems.batchNo), asc(orderItems.createdAt))

        const outstandingItems = sourceItems
            .map((row) => {
                const paid = row.paidQuantity ?? 0
                return {
                    ...row,
                    available: row.quantity - paid,
                    unitPrice: parseMoney(row.price),
                }
            })
            .filter((row) => row.available > 0)

        if (outstandingItems.length === 0) {
            throw new ValidationError('No transferable items on source table')
        }

        // 确定要转移的项目
        const requested =
            moveAll || items.length === 0
                ? outstandingItems.map((row) => ({
                    orderItemId: row.id,
                    quantity: row.available,
                }))
                : items

        if (requested.length === 0) {
            throw new ValidationError('No items selected')
        }

        const sourceMap = new Map(outstandingItems.map((row) => [row.id, row]))

        // 验证请求并计算转移金额
        let transferTotal = 0
        for (const reqItem of requested) {
            const row = sourceMap.get(reqItem.orderItemId)
            if (!row) {
                throw new NotFoundError('订单项', reqItem.orderItemId)
            }
            if (row.paidQuantity && row.paidQuantity > 0) {
                throw new ConflictError('Paid items cannot be transferred')
            }
            if (reqItem.quantity > row.available) {
                throw new ValidationError('Transfer quantity exceeds available amount')
            }
            transferTotal += row.unitPrice * reqItem.quantity
        }

        // 检查目标订单
        const [targetOrder] = await tx
            .select()
            .from(orders)
            .where(and(eq(orders.tableId, targetTableId), eq(orders.status, 'open')))
            .limit(1)

        const targetPaidAmount = targetOrder
            ? parseMoney((targetOrder as { paidAmount?: unknown }).paidAmount ?? 0)
            : 0

        if (targetPaidAmount > 0) {
            throw new ConflictError('Target order has paid items, cannot merge')
        }

        // 计算当前金额
        const existingTargetSubtotal = targetOrder ? parseMoney(targetOrder.subtotal) : 0
        const existingTargetDiscount = targetOrder ? parseMoney(targetOrder.discount) : 0
        const existingTargetTotalAmount = targetOrder
            ? parseMoney((targetOrder as { totalAmount?: unknown }).totalAmount ?? 0)
            : 0

        const existingSourceSubtotal = parseMoney(sourceOrder.subtotal)
        const existingSourceDiscount = parseMoney(sourceOrder.discount)
        const existingSourceTotalAmount = parseMoney(
            (sourceOrder as { totalAmount?: unknown }).totalAmount ?? 0
        )

        // 更新源订单项
        for (const reqItem of requested) {
            const row = sourceMap.get(reqItem.orderItemId)!
            const remaining = row.quantity - reqItem.quantity
            if (remaining <= 0) {
                await tx.delete(orderItems).where(eq(orderItems.id, row.id))
            } else {
                await tx
                    .update(orderItems)
                    .set({ quantity: remaining })
                    .where(eq(orderItems.id, row.id))
            }
        }

        // 创建或更新目标订单
        let targetOrderId = targetOrder?.id ?? ''
        if (!targetOrder) {
            const [created] = await tx
                .insert(orders)
                .values({
                    tableId: targetTableId,
                    status: 'open',
                    subtotal: toMoneyString(transferTotal),
                    discount: '0',
                    total: toMoneyString(transferTotal),
                    totalAmount: toMoneyString(transferTotal),
                    paidAmount: '0',
                })
                .returning()
            targetOrderId = created.id
        }

        // 获取目标订单的最大批次号
        const [{ maxBatch: targetMaxBatch }] = await tx
            .select({ maxBatch: max(orderItems.batchNo) })
            .from(orderItems)
            .where(eq(orderItems.orderId, targetOrderId))

        const targetBatchNo = (targetMaxBatch ?? 0) + 1

        // 在目标订单上插入订单项
        await tx.insert(orderItems).values(
            requested.map((reqItem) => {
                const row = sourceMap.get(reqItem.orderItemId)!
                return {
                    orderId: targetOrderId,
                    menuItemId: row.menuItemId,
                    quantity: reqItem.quantity,
                    paidQuantity: 0,
                    price: toMoneyString(row.unitPrice),
                    notes: row.notes ?? null,
                    batchNo: targetBatchNo,
                }
            })
        )

        // 计算新金额
        const newSourceSubtotal = Math.max(0, existingSourceSubtotal - transferTotal)
        const newSourceTotalAmount = Math.max(0, existingSourceTotalAmount - transferTotal)
        const newSourceTotal = Math.max(0, newSourceSubtotal - existingSourceDiscount)

        const newTargetSubtotal = existingTargetSubtotal + transferTotal
        const newTargetTotalAmount = existingTargetTotalAmount + transferTotal
        const newTargetTotal = Math.max(0, newTargetSubtotal - existingTargetDiscount)

        // 更新源订单
        let sourceResultOrder: typeof orders.$inferSelect | null = sourceOrder
        const remainingRows = await tx
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
            .where(eq(orderItems.orderId, sourceOrder.id))
            .orderBy(asc(orderItems.batchNo), asc(orderItems.createdAt))

        if (remainingRows.length === 0) {
            await tx
                .update(orders)
                .set({
                    status: 'cancelled',
                    subtotal: '0',
                    total: '0',
                    discount: sourceOrder.discount ?? '0',
                    totalAmount: '0',
                    paidAmount: '0',
                    closedAt: new Date(),
                })
                .where(eq(orders.id, sourceOrder.id))

            await tx
                .update(restaurantTables)
                .set({ status: 'idle', amount: '0' })
                .where(eq(restaurantTables.id, sourceTableId))

            sourceResultOrder = null
        } else {
            const remainingOutstanding = calculateOutstanding(remainingRows as OrderItemRow[])
            const [updated] = await tx
                .update(orders)
                .set({
                    subtotal: toMoneyString(newSourceSubtotal),
                    total: toMoneyString(newSourceTotal),
                    totalAmount: toMoneyString(newSourceTotalAmount),
                    discount: sourceOrder.discount ?? '0',
                    status: 'open',
                    closedAt: null,
                })
                .where(eq(orders.id, sourceOrder.id))
                .returning()

            await tx
                .update(restaurantTables)
                .set({
                    status: 'occupied',
                    amount: toMoneyString(remainingOutstanding),
                })
                .where(eq(restaurantTables.id, sourceTableId))

            sourceResultOrder = updated
        }

        // 更新目标订单
        const targetRows = await tx
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
            .where(eq(orderItems.orderId, targetOrderId))
            .orderBy(asc(orderItems.batchNo), asc(orderItems.createdAt))

        const targetOutstanding = calculateOutstanding(targetRows as OrderItemRow[])

        const [updatedTarget] = await tx
            .update(orders)
            .set({
                subtotal: toMoneyString(newTargetSubtotal),
                total: toMoneyString(newTargetTotal),
                totalAmount: toMoneyString(newTargetTotalAmount),
                status: 'open',
                discount: targetOrder?.discount ?? '0',
                closedAt: null,
            })
            .where(eq(orders.id, targetOrderId))
            .returning()

        await tx
            .update(restaurantTables)
            .set({
                status: 'occupied',
                amount: toMoneyString(targetOutstanding),
            })
            .where(eq(restaurantTables.id, targetTableId))

        const sourceBatches = sourceResultOrder
            ? buildOrderBatches(remainingRows as OrderItemRow[], { omitFullyPaid: true })
            : []
        const targetBatches = buildOrderBatches(targetRows as OrderItemRow[], { omitFullyPaid: true })

        return {
            source: {
                tableId: sourceTable.id,
                order: mapOrderSummary(sourceResultOrder),
                batches: sourceBatches,
            },
            target: {
                tableId: targetTable.id,
                order: mapOrderSummary(updatedTarget)!,
                batches: targetBatches,
            },
        }
    })
}
