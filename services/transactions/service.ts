/**
 * 交易服务模块
 *
 * 负责交易相关的业务逻辑处理
 */

import 'server-only'

import { and, eq, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import type * as schema from '@/db/schema'
import {
    transactions,
    transactionItems,
    orderItems,
    orders,
    restaurantTables,
} from '@/db/schema'
import { parseMoney, toMoneyString } from '@/lib/money'
import { NotFoundError, ConflictError, ValidationError } from '@/lib/http/errors'

// 数据库类型定义
type DbClient = NodePgDatabase<typeof schema>

/**
 * 获取交易详情
 */
export async function getTransactionDetails(
    db: DbClient,
    transactionId: string
) {
    const [transaction] = await db
        .select({
            id: transactions.id,
            type: transactions.type,
            category: transactions.category,
            amount: transactions.amount,
            description: transactions.description,
            date: transactions.date,
            paymentMethod: transactions.paymentMethod,
            orderId: transactions.orderId,
            createdAt: transactions.createdAt,
        })
        .from(transactions)
        .where(eq(transactions.id, transactionId))
        .limit(1)

    if (!transaction) {
        throw new NotFoundError('交易', transactionId)
    }

    const items = await db
        .select({
            id: transactionItems.id,
            orderItemId: transactionItems.orderItemId,
            quantity: transactionItems.quantity,
            menuItemId: transactionItems.menuItemId,
            nameSnapshot: transactionItems.nameSnapshot,
            unitPrice: transactionItems.unitPrice,
            createdAt: transactionItems.createdAt,
        })
        .from(transactionItems)
        .where(eq(transactionItems.transactionId, transactionId))

    let tableNumber: string | null = null
    if (transaction.orderId) {
        const [order] = await db
            .select({
                tableId: orders.tableId,
            })
            .from(orders)
            .where(eq(orders.id, transaction.orderId))
            .limit(1)

        if (order?.tableId) {
            const [table] = await db
                .select({
                    number: restaurantTables.number,
                })
                .from(restaurantTables)
                .where(eq(restaurantTables.id, order.tableId))
                .limit(1)

            tableNumber = table?.number ?? null
        }
    }

    return {
        transaction: {
            id: transaction.id,
            type: transaction.type,
            category: transaction.category,
            amount: parseMoney(transaction.amount),
            description: transaction.description,
            date: transaction.date,
            paymentMethod: transaction.paymentMethod,
            orderId: transaction.orderId,
            createdAt: transaction.createdAt.toISOString(),
            tableNumber,
        },
        items: items.map((item) => ({
            id: item.id,
            orderItemId: item.orderItemId,
            quantity: item.quantity,
            menuItemId: item.menuItemId,
            nameSnapshot: item.nameSnapshot,
            unitPrice: parseMoney(item.unitPrice),
            createdAt: item.createdAt.toISOString(),
        })),
        hasItems: items.length > 0,
    }
}

/**
 * 反结算交易
 */
export async function reverseTransaction(
    db: DbClient,
    transactionId: string
) {
    return await db.transaction(async (tx) => {
        const [transaction] = await tx
            .select({
                id: transactions.id,
                type: transactions.type,
                amount: transactions.amount,
                orderId: transactions.orderId,
                paymentMethod: transactions.paymentMethod,
            })
            .from(transactions)
            .where(eq(transactions.id, transactionId))
            .limit(1)

        if (!transaction) {
            throw new NotFoundError('交易', transactionId)
        }

        if (transaction.type !== 'income') {
            throw new ValidationError('Only income transactions can be reversed', {
                code: 'INVALID_TRANSACTION_TYPE',
            })
        }

        const items = await tx
            .select({
                id: transactionItems.id,
                orderItemId: transactionItems.orderItemId,
                quantity: transactionItems.quantity,
                unitPrice: transactionItems.unitPrice,
            })
            .from(transactionItems)
            .where(eq(transactionItems.transactionId, transactionId))

        if (items.length === 0) {
            throw new ValidationError('该结算单无法反结算（缺少明细）', {
                code: 'NO_TRANSACTION_ITEMS',
            })
        }

        if (!transaction.orderId) {
            throw new ValidationError('Transaction has no associated order', {
                code: 'NO_ORDER_ID',
            })
        }

        const [order] = await tx
            .select({
                id: orders.id,
                tableId: orders.tableId,
                status: orders.status,
            })
            .from(orders)
            .where(eq(orders.id, transaction.orderId))
            .limit(1)

        if (!order) {
            throw new NotFoundError('订单', transaction.orderId)
        }

        let tableId = order.tableId
        let tableNumber: string | null = null

        if (tableId) {
            const [table] = await tx
                .select({
                    id: restaurantTables.id,
                    number: restaurantTables.number,
                })
                .from(restaurantTables)
                .where(eq(restaurantTables.id, tableId))
                .limit(1)

            if (table) {
                tableNumber = table.number
            }

            // 检查是否有其他 open 订单
            const [existingOpenOrder] = await tx
                .select({ id: orders.id })
                .from(orders)
                .where(
                    and(eq(orders.tableId, tableId), eq(orders.status, 'open'))
                )
                .limit(1)

            if (existingOpenOrder && existingOpenOrder.id !== order.id) {
                throw new ConflictError('桌台已有其他打开的订单，无法反结算')
            }
        }

        // 恢复订单项的已付数量
        for (const item of items) {
            const [orderItem] = await tx
                .select({
                    id: orderItems.id,
                    paidQuantity: orderItems.paidQuantity,
                })
                .from(orderItems)
                .where(eq(orderItems.id, item.orderItemId))
                .limit(1)

            if (orderItem) {
                const newPaidQty = Math.max(0, (orderItem.paidQuantity ?? 0) - item.quantity)
                await tx
                    .update(orderItems)
                    .set({ paidQuantity: newPaidQty })
                    .where(eq(orderItems.id, item.orderItemId))
            }
        }

        // 删除交易记录
        await tx.delete(transactions).where(eq(transactions.id, transactionId))

        // 重新计算订单已付金额
        const remainingTransactions = await tx
            .select({
                totalAmount: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
            })
            .from(transactions)
            .where(eq(transactions.orderId, order.id))

        const newPaidAmount = parseMoney(remainingTransactions[0]?.totalAmount ?? '0')

        // 重新计算订单小计
        const orderItemsRows = await tx
            .select({
                price: orderItems.price,
                quantity: orderItems.quantity,
                paidQuantity: orderItems.paidQuantity,
            })
            .from(orderItems)
            .where(eq(orderItems.orderId, order.id))

        let newSubtotal = 0
        let hasUnpaidItems = false
        for (const row of orderItemsRows) {
            const price = parseMoney(row.price)
            newSubtotal += price * row.quantity
            if ((row.paidQuantity ?? 0) < row.quantity) {
                hasUnpaidItems = true
            }
        }

        const newStatus = hasUnpaidItems ? 'open' : 'paid'
        const newTotal = newPaidAmount

        // 更新订单
        await tx
            .update(orders)
            .set({
                status: newStatus,
                subtotal: toMoneyString(newSubtotal),
                discount: '0',
                total: toMoneyString(newTotal),
                paidAmount: toMoneyString(newPaidAmount),
                closedAt: newStatus === 'open' ? null : new Date(),
            })
            .where(eq(orders.id, order.id))

        // 更新桌台状态
        if (tableId && newStatus === 'open') {
            const unpaidSubtotal = orderItemsRows.reduce((sum, row) => {
                const unpaidQty = row.quantity - (row.paidQuantity ?? 0)
                return sum + parseMoney(row.price) * unpaidQty
            }, 0)

            await tx
                .update(restaurantTables)
                .set({
                    status: 'occupied',
                    amount: toMoneyString(unpaidSubtotal),
                    startedAt: new Date(),
                })
                .where(eq(restaurantTables.id, tableId))
        }

        console.info(
            `Transaction ${transactionId} reversed successfully, order ${order.id} status: ${newStatus}`
        )

        return {
            success: true,
            orderId: order.id,
            orderStatus: newStatus,
            tableNumber,
            reversedAmount: parseMoney(transaction.amount),
            newPaidAmount,
        }
    })
}
