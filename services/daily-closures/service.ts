/**
 * 日结服务模块
 *
 * 负责日结相关的业务逻辑处理
 */

import 'server-only'

import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import type * as schema from '@/db/schema'
import { parseMoney } from '@/lib/money'
import { NotFoundError } from '@/lib/http/errors'
import {
    aggregateIncomeByPaymentMethod,
    buildDailyClosureItems,
    buildDailyClosurePayments,
    calculateDailyClosureOverview,
    type DailyClosureItemLine,
    type DailyClosureItems,
    type DailyClosureOverview,
    type DailyClosurePaymentLineInput,
} from '@/lib/daily-closure/calculate'
import {
    getOrInitDailyClosureState,
    lockAndGetDailyClosureState,
    updateDailyClosureState,
    createDailyClosure,
    createDailyClosurePaymentLines,
    createDailyClosureItemLines,
    createDailyClosureAdjustments,
    getDailyClosureById,
    getDailyClosurePaymentLines,
    getDailyClosureAdjustments,
    getDailyClosureItemLines,
    getIncomeTransactionsByRange,
    getOrdersCountByRange,
    getOrderItemsByRange,
    addDailyClosureAdjustment,
} from '@/repositories/daily-closures'

// 数据库类型定义
type DbClient = NodePgDatabase<typeof schema>
type TxClient = Parameters<Parameters<DbClient['transaction']>[0]>[0]
type DbOrTx = DbClient | TxClient

export const DEFAULT_DAILY_CLOSURE_TAX_RATE = 0.1

/**
 * 转换日期为 ISO 字符串
 */
export function toIsoString(value: unknown): string | null {
    if (value instanceof Date) return value.toISOString()
    if (typeof value === 'string') {
        const parsed = new Date(value)
        return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString()
    }
    return null
}

function toBusinessDateString(value: unknown): string {
    if (value instanceof Date) return value.toISOString().slice(0, 10)
    if (typeof value === 'string') return value
    return String(value ?? '')
}

/**
 * 按时间区间计算日结快照
 */
export async function computeClosureSnapshotByRange(
    db: DbOrTx,
    periodStartAt: Date,
    periodEndAt: Date,
    taxRate: number
): Promise<{
    overview: DailyClosureOverview
    paymentLines: DailyClosurePaymentLineInput[]
    items: DailyClosureItems
}> {
    // 获取收入交易
    const incomeRows = await getIncomeTransactionsByRange(db, periodStartAt, periodEndAt)
    const incomeTransactions = incomeRows.map((row) => ({
        paymentMethod: row.paymentMethod,
        amount: parseMoney(row.amount),
    }))

    const paymentLines = aggregateIncomeByPaymentMethod(incomeTransactions)
    const grossRevenue = incomeTransactions.reduce((sum, t) => sum + t.amount, 0)

    // 统计订单数
    const ordersCount = await getOrdersCountByRange(db, periodStartAt, periodEndAt)

    // 获取订单菜品明细
    const rawRows = await getOrderItemsByRange(db, periodStartAt, periodEndAt)

    // 按订单分组
    const perOrder = new Map<
        string,
        {
            discountAmount: number
            items: Array<{
                menuItemId: string
                name: string
                category: string
                quantity: number
                subtotal: number
            }>
        }
    >()

    for (const row of rawRows) {
        const orderId = row.orderId as string
        const entry = perOrder.get(orderId) ?? {
            discountAmount: parseMoney(row.orderDiscount),
            items: [],
        }

        const quantity = Math.max(0, Math.trunc(row.quantity ?? 0))
        const price = parseMoney(row.price)
        const subtotal = price * quantity

        entry.items.push({
            menuItemId: row.menuItemId,
            name: row.name,
            category: row.category,
            quantity,
            subtotal,
        })

        perOrder.set(orderId, entry)
    }

    // 计算菜品汇总
    const totals = new Map<
        string,
        {
            menuItemId: string
            name: string
            category: string
            quantitySold: number
            revenueAmount: number
            discountImpactAmount: number
        }
    >()

    for (const order of perOrder.values()) {
        const orderSubtotal = order.items.reduce((sum, item) => sum + item.subtotal, 0)
        const discountAmount = orderSubtotal > 0 ? order.discountAmount : 0

        for (const item of order.items) {
            const ratio = orderSubtotal > 0 ? item.subtotal / orderSubtotal : 0
            const allocatedDiscount = discountAmount * ratio
            const revenue = item.subtotal - allocatedDiscount

            const existing = totals.get(item.menuItemId) ?? {
                menuItemId: item.menuItemId,
                name: item.name,
                category: item.category,
                quantitySold: 0,
                revenueAmount: 0,
                discountImpactAmount: 0,
            }

            existing.quantitySold += item.quantity
            existing.revenueAmount += revenue
            existing.discountImpactAmount += allocatedDiscount
            totals.set(item.menuItemId, existing)
        }
    }

    const items = buildDailyClosureItems(
        Array.from(totals.values()).map((line) => ({
            menuItemId: line.menuItemId,
            name: line.name,
            category: line.category,
            quantitySold: line.quantitySold,
            revenueAmount: line.revenueAmount,
            discountImpactAmount: line.discountImpactAmount,
        }))
    )

    const overview = calculateDailyClosureOverview({
        grossRevenue,
        ordersCount,
        taxRate,
        refundAmount: 0,
        voidAmount: 0,
    })

    return {
        overview,
        paymentLines,
        items,
    }
}

/**
 * 获取当前日结预览
 */
export async function getCurrentClosurePreview(db: DbClient) {
    // 获取当前统计区间起点
    const state = await getOrInitDailyClosureState(db as unknown as DbOrTx)
    const periodStartAt = state.currentPeriodStartAt
    const periodEndAt = new Date()
    const taxRate = DEFAULT_DAILY_CLOSURE_TAX_RATE

    // 计算当前区间的预览快照
    const snapshot = await computeClosureSnapshotByRange(
        db as unknown as DbOrTx,
        periodStartAt,
        periodEndAt,
        taxRate
    )

    return {
        periodStartAt: toIsoString(periodStartAt),
        periodEndAt: toIsoString(periodEndAt),
        sequenceNo: null, // 预览状态，尚未生成报告
        taxRate,
        locked: false,
        closureId: null,
        lockedAt: null,
        overview: snapshot.overview,
        payments: buildDailyClosurePayments(snapshot.paymentLines, []),
        items: snapshot.items,
        adjustments: [],
        meta: {
            refundVoidPolicy:
                '当前系统未实现退款/作废流水统计口径，接口固定返回 0（后续可通过 transactions 扩展）。',
        },
    }
}

/**
 * 确认日结输入
 */
export interface ConfirmClosureInput {
    taxRate?: number
    adjustments?: Array<{
        type: 'fee' | 'rounding' | 'other'
        amount: number
        note: string
        paymentMethod?: string | null
    }>
}

/**
 * 确认日结（生成报告）
 */
export async function confirmDailyClosure(
    db: DbClient,
    input: ConfirmClosureInput
) {
    const taxRate = input.taxRate ?? DEFAULT_DAILY_CLOSURE_TAX_RATE
    const initialAdjustments = input.adjustments ?? []

    return await db.transaction(async (tx) => {
        const periodEndAt = new Date()
        const businessDate = periodEndAt.toISOString().slice(0, 10)

        // 锁定并获取状态
        const state = await lockAndGetDailyClosureState(tx)
        const periodStartAt = state.currentPeriodStartAt
        const sequenceNo = state.nextSequenceNo

        // 计算当前区间的快照
        const snapshot = await computeClosureSnapshotByRange(tx, periodStartAt, periodEndAt, taxRate)

        // 写入日结报告
        const closure = await createDailyClosure(tx, {
            businessDate,
            sequenceNo,
            periodStartAt,
            periodEndAt,
            taxRate,
            grossRevenue: snapshot.overview.grossRevenue,
            netRevenue: snapshot.overview.netRevenue,
            ordersCount: snapshot.overview.ordersCount,
            refundAmount: snapshot.overview.refundAmount,
            voidAmount: snapshot.overview.voidAmount,
        })

        if (!closure) {
            throw new Error('Failed to create daily closure record')
        }

        // 写入支付方式明细
        await createDailyClosurePaymentLines(
            tx,
            closure.id,
            snapshot.paymentLines.map((line) => ({
                paymentMethod: line.paymentMethod,
                paymentGroup: line.paymentGroup,
                expectedAmount: line.expectedAmount,
            }))
        )

        // 写入菜品明细
        await createDailyClosureItemLines(
            tx,
            closure.id,
            snapshot.items.lines.map((line) => ({
                menuItemId: line.menuItemId,
                nameSnapshot: line.name,
                categorySnapshot: line.category,
                quantitySold: line.quantitySold,
                revenueAmount: line.revenueAmount,
                discountImpactAmount: line.discountImpactAmount,
            }))
        )

        // 写入初始差额调整
        await createDailyClosureAdjustments(tx, closure.id, initialAdjustments)

        // 推进 state：下一个区间的起点 = 本次的终点
        await updateDailyClosureState(tx, {
            currentPeriodStartAt: periodEndAt,
            nextSequenceNo: sequenceNo + 1,
        })

        // 查询完整数据返回
        const paymentLines = await getDailyClosurePaymentLines(tx, closure.id)
        const adjustments = await getDailyClosureAdjustments(tx, closure.id)
        const itemLines = await getDailyClosureItemLines(tx, closure.id)

        // 构建响应
        const overview = calculateDailyClosureOverview({
            grossRevenue: parseMoney(closure.grossRevenue),
            ordersCount: closure.ordersCount,
            taxRate: parseMoney(closure.taxRate),
            refundAmount: parseMoney(closure.refundAmount),
            voidAmount: parseMoney(closure.voidAmount),
        })

        const payments = buildDailyClosurePayments(
            paymentLines.map((line) => ({
                paymentMethod: line.paymentMethod,
                paymentGroup: line.paymentGroup,
                expectedAmount: parseMoney(line.expectedAmount),
            })),
            adjustments.map((row) => ({
                amount: parseMoney(row.amount),
                paymentMethod: row.paymentMethod ?? null,
            }))
        )

        return {
            periodStartAt: toIsoString(closure.periodStartAt),
            periodEndAt: toIsoString(closure.periodEndAt),
            sequenceNo: closure.sequenceNo,
            taxRate: parseMoney(closure.taxRate),
            locked: true,
            closureId: closure.id,
            lockedAt: toIsoString(closure.lockedAt),
            overview,
            payments,
            items: {
                categories: snapshot.items.categories,
                lines: itemLines.map((row) => ({
                    menuItemId: row.menuItemId ?? null,
                    name: row.nameSnapshot,
                    category: row.categorySnapshot,
                    quantitySold: row.quantitySold,
                    revenueAmount: parseMoney(row.revenueAmount),
                    discountImpactAmount:
                        row.discountImpactAmount == null ? null : parseMoney(row.discountImpactAmount),
                })),
            },
            adjustments: adjustments.map((row) => ({
                id: row.id,
                type: row.type,
                amount: parseMoney(row.amount),
                note: row.note,
                paymentMethod: row.paymentMethod ?? null,
                createdAt: toIsoString(row.createdAt) ?? '',
            })),
            meta: {
                refundVoidPolicy:
                    '当前系统未实现退款/作废流水统计口径，接口固定返回 0（后续可通过 transactions 扩展）。',
            },
        }
    })
}

/**
 * 添加日结调整
 */
export async function addClosureAdjustment(
    db: DbClient,
    closureId: string,
    adjustment: {
        type: 'fee' | 'rounding' | 'other'
        amount: number
        note: string
        paymentMethod?: string | null
    }
) {
    // 检查日结是否存在
    const closureData = await getDailyClosureById(db as unknown as DbOrTx, closureId)
    if (!closureData) {
        throw new NotFoundError('日结', closureId)
    }

    // 添加调整
    const created = await addDailyClosureAdjustment(
        db as unknown as DbOrTx,
        closureId,
        adjustment
    )

    return {
        id: created.id,
        type: created.type,
        amount: parseMoney(created.amount),
        note: created.note,
        paymentMethod: created.paymentMethod ?? null,
        createdAt: toIsoString(created.createdAt) ?? '',
    }
}

/**
 * 获取日结调整列表
 */
export async function getClosureAdjustments(db: DbClient, closureId: string) {
    const adjustments = await getDailyClosureAdjustments(db as unknown as DbOrTx, closureId)

    return adjustments.map((row) => ({
        id: row.id,
        type: row.type,
        amount: parseMoney(row.amount),
        note: row.note,
        paymentMethod: row.paymentMethod ?? null,
        createdAt: toIsoString(row.createdAt) ?? '',
    }))
}

/**
 * 获取日结详情
 */
export async function getClosureDetails(
    db: DbClient,
    closureId: string
) {
    const closureData = await getDailyClosureById(db as unknown as DbOrTx, closureId)
    if (!closureData) {
        throw new NotFoundError('日结', closureId)
    }

    const { closure, paymentLines, adjustments, itemLines } = closureData
    const taxRate = parseMoney(closure.taxRate)

    const overview = calculateDailyClosureOverview({
        grossRevenue: parseMoney(closure.grossRevenue),
        ordersCount: closure.ordersCount ?? 0,
        taxRate,
        refundAmount: parseMoney(closure.refundAmount),
        voidAmount: parseMoney(closure.voidAmount),
    })

    const normalizedPaymentLines: DailyClosurePaymentLineInput[] = paymentLines.map((line) => ({
        paymentMethod: line.paymentMethod,
        paymentGroup: line.paymentGroup,
        expectedAmount: parseMoney(line.expectedAmount),
    }))

    const payments = buildDailyClosurePayments(
        normalizedPaymentLines,
        adjustments.map((row) => ({
            amount: parseMoney(row.amount),
            paymentMethod: row.paymentMethod ?? null,
        }))
    )

    const normalizedItemLines: DailyClosureItemLine[] = itemLines.map((row) => ({
        menuItemId: row.menuItemId ?? null,
        name: row.nameSnapshot,
        category: row.categorySnapshot,
        quantitySold: row.quantitySold,
        revenueAmount: parseMoney(row.revenueAmount),
        discountImpactAmount:
            row.discountImpactAmount == null ? null : parseMoney(row.discountImpactAmount),
    }))

    return {
        periodStartAt: toIsoString(closure.periodStartAt),
        periodEndAt: toIsoString(closure.periodEndAt),
        sequenceNo: closure.sequenceNo,
        businessDate: toBusinessDateString(closure.businessDate),
        taxRate,
        locked: Boolean(closure.lockedAt),
        closureId: closure.id,
        lockedAt: toIsoString(closure.lockedAt),
        overview,
        payments,
        items: buildDailyClosureItems(normalizedItemLines),
        adjustments: adjustments.map((row) => ({
            id: row.id,
            type: row.type,
            amount: parseMoney(row.amount),
            note: row.note,
            paymentMethod: row.paymentMethod ?? null,
            createdAt: toIsoString(row.createdAt) ?? '',
        })),
        meta: {
            refundVoidPolicy:
                '当前系统未实现退款/作废流水统计口径，接口固定返回 0（后续可通过 transactions 扩展）。',
        },
    }
}
