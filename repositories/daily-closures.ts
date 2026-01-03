/**
 * 日结数据访问模块
 *
 * 提供日结表的 CRUD 操作
 * 所有数据库访问都必须经过此模块
 */

import 'server-only'

import { and, desc, eq, gte, lt, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import {
    dailyClosures,
    dailyClosureState,
    dailyClosureAdjustments,
    dailyClosurePaymentLines,
    dailyClosureItemLines,
    orders,
    orderItems,
    menuItems,
    transactions,
} from '@/db/schema'
import type * as schema from '@/db/schema'
import { parseMoney, toMoneyString } from '@/lib/money'

// 数据库类型定义
type DbClient = NodePgDatabase<typeof schema>
type TxClient = Parameters<Parameters<DbClient['transaction']>[0]>[0]
type DbOrTx = DbClient | TxClient

/**
 * 获取或初始化日结状态
 */
export async function getOrInitDailyClosureState(
    db: DbOrTx
): Promise<{ currentPeriodStartAt: Date; nextSequenceNo: number }> {
    const [state] = await db
        .select()
        .from(dailyClosureState)
        .where(eq(dailyClosureState.id, 1))
        .limit(1)

    if (state) {
        return {
            currentPeriodStartAt: state.currentPeriodStartAt,
            nextSequenceNo: state.nextSequenceNo,
        }
    }

    const now = new Date()
    const [lastClosure] = await db
        .select({
            periodEndAt: dailyClosures.periodEndAt,
            sequenceNo: dailyClosures.sequenceNo,
        })
        .from(dailyClosures)
        .orderBy(desc(dailyClosures.sequenceNo))
        .limit(1)

    // 初始化状态：从"上一份报告结束时间"开始；若没有历史报告，则从 now 开始
    const currentPeriodStartAt = lastClosure?.periodEndAt ?? now
    const nextSequenceNo = (lastClosure?.sequenceNo ?? 0) + 1

    await db
        .insert(dailyClosureState)
        .values({
            id: 1,
            currentPeriodStartAt,
            nextSequenceNo,
            updatedAt: now,
        })
        .onConflictDoNothing()

    return {
        currentPeriodStartAt,
        nextSequenceNo,
    }
}

/**
 * 锁定并获取日结状态（SELECT FOR UPDATE）
 */
export async function lockAndGetDailyClosureState(
    tx: TxClient
): Promise<{ currentPeriodStartAt: Date; nextSequenceNo: number }> {
    const now = new Date()
    const [lastClosure] = await tx
        .select({
            periodEndAt: dailyClosures.periodEndAt,
            sequenceNo: dailyClosures.sequenceNo,
        })
        .from(dailyClosures)
        .orderBy(desc(dailyClosures.sequenceNo))
        .limit(1)

    // 确保 state 行存在
    await tx
        .insert(dailyClosureState)
        .values({
            id: 1,
            currentPeriodStartAt: lastClosure?.periodEndAt ?? now,
            nextSequenceNo: (lastClosure?.sequenceNo ?? 0) + 1,
            updatedAt: now,
        })
        .onConflictDoNothing()

    // 锁定 state 行
    const [state] = await tx
        .select()
        .from(dailyClosureState)
        .where(eq(dailyClosureState.id, 1))
        .for('update')

    if (!state) {
        throw new Error('Failed to initialize daily closure state')
    }

    return {
        currentPeriodStartAt: state.currentPeriodStartAt,
        nextSequenceNo: state.nextSequenceNo,
    }
}

/**
 * 更新日结状态
 */
export async function updateDailyClosureState(
    tx: TxClient,
    data: {
        currentPeriodStartAt: Date
        nextSequenceNo: number
    }
) {
    await tx
        .update(dailyClosureState)
        .set({
            currentPeriodStartAt: data.currentPeriodStartAt,
            nextSequenceNo: data.nextSequenceNo,
            updatedAt: new Date(),
        })
        .where(eq(dailyClosureState.id, 1))
}

/**
 * 创建日结记录
 */
export async function createDailyClosure(
    tx: TxClient,
    data: {
        businessDate: string
        sequenceNo: number
        periodStartAt: Date
        periodEndAt: Date
        taxRate: number
        grossRevenue: number
        netRevenue: number
        ordersCount: number
        refundAmount: number
        voidAmount: number
    }
) {
    const [closure] = await tx
        .insert(dailyClosures)
        .values({
            businessDate: data.businessDate,
            sequenceNo: data.sequenceNo,
            periodStartAt: data.periodStartAt,
            periodEndAt: data.periodEndAt,
            taxRate: data.taxRate.toFixed(4),
            grossRevenue: toMoneyString(data.grossRevenue),
            netRevenue: toMoneyString(data.netRevenue),
            ordersCount: data.ordersCount,
            refundAmount: toMoneyString(data.refundAmount),
            voidAmount: toMoneyString(data.voidAmount),
            lockedAt: data.periodEndAt,
        })
        .returning()

    return closure
}

/**
 * 创建日结支付方式明细
 */
export async function createDailyClosurePaymentLines(
    tx: TxClient,
    closureId: string,
    lines: Array<{
        paymentMethod: string
        paymentGroup: 'cash' | 'card' | 'platform' | 'other'
        expectedAmount: number
    }>
) {
    if (lines.length === 0) return

    await tx.insert(dailyClosurePaymentLines).values(
        lines.map((line) => ({
            closureId,
            paymentMethod: line.paymentMethod,
            paymentGroup: line.paymentGroup,
            expectedAmount: toMoneyString(line.expectedAmount),
        }))
    )
}

/**
 * 创建日结菜品明细
 */
export async function createDailyClosureItemLines(
    tx: TxClient,
    closureId: string,
    lines: Array<{
        menuItemId: string | null
        nameSnapshot: string
        categorySnapshot: string
        quantitySold: number
        revenueAmount: number
        discountImpactAmount: number | null
    }>
) {
    if (lines.length === 0) return

    await tx.insert(dailyClosureItemLines).values(
        lines.map((line) => ({
            closureId,
            menuItemId: line.menuItemId,
            nameSnapshot: line.nameSnapshot,
            categorySnapshot: line.categorySnapshot,
            quantitySold: line.quantitySold,
            revenueAmount: toMoneyString(line.revenueAmount),
            discountImpactAmount:
                line.discountImpactAmount == null
                    ? null
                    : toMoneyString(line.discountImpactAmount),
        }))
    )
}

/**
 * 创建日结调整
 */
export async function createDailyClosureAdjustments(
    tx: TxClient,
    closureId: string,
    adjustments: Array<{
        type: 'fee' | 'rounding' | 'other'
        amount: number
        note: string
        paymentMethod?: string | null
    }>
) {
    if (adjustments.length === 0) return

    await tx.insert(dailyClosureAdjustments).values(
        adjustments.map((adj) => ({
            closureId,
            type: adj.type,
            amount: toMoneyString(adj.amount),
            note: adj.note,
            paymentMethod: adj.paymentMethod ?? null,
        }))
    )
}

/**
 * 根据 ID 获取日结详情
 */
export async function getDailyClosureById(
    db: DbOrTx,
    id: string
) {
    const [closure] = await db
        .select()
        .from(dailyClosures)
        .where(eq(dailyClosures.id, id))
        .limit(1)

    if (!closure) return null

    const paymentLines = await db
        .select()
        .from(dailyClosurePaymentLines)
        .where(eq(dailyClosurePaymentLines.closureId, closure.id))

    const adjustments = await db
        .select()
        .from(dailyClosureAdjustments)
        .where(eq(dailyClosureAdjustments.closureId, closure.id))
        .orderBy(dailyClosureAdjustments.createdAt)

    const itemLines = await db
        .select()
        .from(dailyClosureItemLines)
        .where(eq(dailyClosureItemLines.closureId, closure.id))

    return {
        closure,
        paymentLines,
        adjustments,
        itemLines,
    }
}

/**
 * 获取日结支付方式明细
 */
export async function getDailyClosurePaymentLines(
    db: DbOrTx,
    closureId: string
) {
    return await db
        .select()
        .from(dailyClosurePaymentLines)
        .where(eq(dailyClosurePaymentLines.closureId, closureId))
}

/**
 * 获取日结调整
 */
export async function getDailyClosureAdjustments(
    db: DbOrTx,
    closureId: string
) {
    return await db
        .select()
        .from(dailyClosureAdjustments)
        .where(eq(dailyClosureAdjustments.closureId, closureId))
        .orderBy(dailyClosureAdjustments.createdAt)
}

/**
 * 获取日结菜品明细
 */
export async function getDailyClosureItemLines(
    db: DbOrTx,
    closureId: string
) {
    return await db
        .select()
        .from(dailyClosureItemLines)
        .where(eq(dailyClosureItemLines.closureId, closureId))
}

/**
 * 按时间区间获取收入交易
 */
export async function getIncomeTransactionsByRange(
    db: DbOrTx,
    periodStartAt: Date,
    periodEndAt: Date
) {
    return await db
        .select({
            paymentMethod: transactions.paymentMethod,
            amount: transactions.amount,
        })
        .from(transactions)
        .where(
            and(
                eq(transactions.type, 'income'),
                gte(transactions.createdAt, periodStartAt),
                lt(transactions.createdAt, periodEndAt)
            )
        )
}

/**
 * 按时间区间统计订单数
 */
export async function getOrdersCountByRange(
    db: DbOrTx,
    periodStartAt: Date,
    periodEndAt: Date
): Promise<number> {
    const [row] = await db
        .select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(
            and(
                eq(orders.status, 'paid'),
                gte(orders.closedAt, periodStartAt),
                lt(orders.closedAt, periodEndAt)
            )
        )

    return Math.max(0, Math.trunc(Number(row?.count ?? 0)))
}

/**
 * 按时间区间获取订单菜品明细
 */
export async function getOrderItemsByRange(
    db: DbOrTx,
    periodStartAt: Date,
    periodEndAt: Date
) {
    return await db
        .select({
            orderId: orders.id,
            orderDiscount: orders.discount,
            menuItemId: menuItems.id,
            name: menuItems.name,
            category: menuItems.category,
            quantity: orderItems.quantity,
            price: orderItems.price,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
        .where(
            and(
                eq(orders.status, 'paid'),
                gte(orders.closedAt, periodStartAt),
                lt(orders.closedAt, periodEndAt)
            )
        )
}

/**
 * 添加日结调整（对已锁定的日结添加调整）
 */
export async function addDailyClosureAdjustment(
    db: DbOrTx,
    closureId: string,
    adjustment: {
        type: 'fee' | 'rounding' | 'other'
        amount: number
        note: string
        paymentMethod?: string | null
    }
) {
    const [created] = await db
        .insert(dailyClosureAdjustments)
        .values({
            closureId,
            type: adjustment.type,
            amount: toMoneyString(adjustment.amount),
            note: adjustment.note,
            paymentMethod: adjustment.paymentMethod ?? null,
        })
        .returning()

    return created
}
