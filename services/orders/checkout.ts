/**
 * 结账服务模块
 *
 * 处理订单结账相关的业务逻辑
 * 包括全额结账和 AA 结账两种模式
 */

import 'server-only'

import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import type * as schema from '@/db/schema'
import { parseMoney, toMoneyString } from '@/lib/money'
import { buildOrderBatches, type OrderItemRow } from '@/lib/order-utils'
import { NotFoundError, ConflictError, ValidationError } from '@/lib/http/errors'
import type { CheckoutInput } from '@/lib/contracts/orders'

import {
    getOrderByTableAndId,
    updateOrderStatus,
} from '@/repositories/orders'
import {
    getOrderItemsByOrderId,
    updateOrderItemPaidQuantity,
} from '@/repositories/order-items'
import {
    createTransaction,
    createTransactionItems,
} from '@/repositories/transactions'
import { getTableById, resetTableToIdle, updateTableStatus } from '@/repositories/tables'

// 数据库类型定义
type DbClient = NodePgDatabase<typeof schema>

/**
 * 结账结果
 */
export interface CheckoutResult {
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
    transaction: {
        id: string
        type: string
        category: string
        amount: number
        paymentMethod: string
        orderId: string | null
        date: string
        createdAt: string
    } | null
    table: {
        id: string
        number: string
    }
    meta: {
        mode: 'full' | 'aa'
        receivedAmount: number
        changeAmount: number
    }
}

/**
 * 计算小计金额
 */
function calculateSubtotals(
    rows: Array<{
        price: unknown
        quantity: number
        paidQuantity?: number | null
    }>
) {
    let fullSubtotal = 0
    let outstandingSubtotal = 0

    for (const row of rows) {
        const price = parseMoney(row.price)
        fullSubtotal += price * row.quantity
        const unpaidQty = row.quantity - (row.paidQuantity ?? 0)
        if (unpaidQty > 0) {
            outstandingSubtotal += price * unpaidQty
        }
    }

    return { fullSubtotal, outstandingSubtotal }
}

/**
 * 标准化交易日期
 */
function normalizeTransactionDate(value: unknown) {
    if (value instanceof Date) {
        return value.toISOString().slice(0, 10)
    }
    const parsed = new Date(value as string)
    return Number.isNaN(parsed.getTime())
        ? String(value ?? '')
        : parsed.toISOString().slice(0, 10)
}

/**
 * 处理 AA 结账
 */
async function processAACheckout(
    tx: Parameters<Parameters<DbClient['transaction']>[0]>[0],
    input: CheckoutInput,
    order: Awaited<ReturnType<typeof getOrderByTableAndId>>,
    table: Awaited<ReturnType<typeof getTableById>>,
    rows: OrderItemRow[]
): Promise<CheckoutResult> {
    const {
        tableId,
        paymentMethod,
        discountPercent = 0,
        clientSubtotal,
        clientTotal,
        receivedAmount,
        aaItems,
    } = input

    if (!aaItems || aaItems.length === 0) {
        throw new ValidationError('AA items are required', { code: 'AA_ITEMS_REQUIRED' })
    }

    const epsilon = 0.01

    // 按菜品分组并计算可用数量
    const itemsByMenuItem = new Map<
        string,
        {
            totalQuantity: number
            unpaidQuantity: number
            rows: Array<
                OrderItemRow & {
                    numericPrice: number
                    unpaidQuantity: number
                }
            >
        }
    >()

    for (const row of rows) {
        const numericPrice = parseMoney(row.price)
        const paidQty = row.paidQuantity ?? 0
        const unpaidQty = row.quantity - paidQty
        if (unpaidQty <= 0) continue

        const existing = itemsByMenuItem.get(row.menuItemId) ?? {
            totalQuantity: 0,
            unpaidQuantity: 0,
            rows: [],
        }
        existing.totalQuantity += row.quantity
        existing.unpaidQuantity += unpaidQty
        existing.rows.push({
            ...row,
            numericPrice,
            unpaidQuantity: unpaidQty,
        })
        itemsByMenuItem.set(row.menuItemId, existing)
    }

    // 合并 AA 请求项
    const aaByMenuItem = new Map<string, { quantity: number }>()
    for (const item of aaItems) {
        const existing = aaByMenuItem.get(item.menuItemId)
        if (existing) {
            existing.quantity += item.quantity
        } else {
            aaByMenuItem.set(item.menuItemId, { quantity: item.quantity })
        }
    }

    // 校验 AA 数量是否超出可用数量
    for (const [menuItemId, { quantity }] of aaByMenuItem.entries()) {
        const entry = itemsByMenuItem.get(menuItemId)
        const availableQuantity = entry?.unpaidQuantity ?? 0
        if (availableQuantity < quantity) {
            throw new ValidationError('AA quantity exceeds available order quantity', {
                code: 'AA_QUANTITY_EXCEEDS_ORDER',
                detail: { menuItemId, requestedQuantity: quantity, availableQuantity },
            })
        }
    }

    // 分配数量并计算小计
    let aaDbSubtotal = 0
    const allocationByRowId = new Map<string, number>()

    for (const [menuItemId, { quantity }] of aaByMenuItem.entries()) {
        const entry = itemsByMenuItem.get(menuItemId)
        if (!entry) continue

        let remaining = quantity
        for (const row of entry.rows) {
            if (remaining <= 0) break
            const available = row.unpaidQuantity
            if (available <= 0) continue
            const useQty = Math.min(available, remaining)
            if (useQty > 0) {
                const existing = allocationByRowId.get(row.id) ?? 0
                allocationByRowId.set(row.id, existing + useQty)
                aaDbSubtotal += row.numericPrice * useQty
                remaining -= useQty
            }
        }
    }

    // 校验客户端金额
    const discountRate = discountPercent > 0 ? discountPercent / 100 : 0
    const aaDiscountAmount = aaDbSubtotal * discountRate
    const aaCalculatedTotal = aaDbSubtotal - aaDiscountAmount

    if (Math.abs(clientSubtotal - aaDbSubtotal) > epsilon) {
        throw new ConflictError(`Client subtotal does not match server subtotal: ${clientSubtotal} vs ${aaDbSubtotal.toFixed(2)}`)
    }

    if (Math.abs(clientTotal - aaCalculatedTotal) > epsilon) {
        throw new ConflictError(`Client total does not match server total: ${clientTotal} vs ${aaCalculatedTotal.toFixed(2)}`)
    }

    const effectiveReceived =
        receivedAmount != null && receivedAmount > 0 ? receivedAmount : aaCalculatedTotal

    if (effectiveReceived + epsilon < aaCalculatedTotal) {
        throw new ValidationError('Received amount is less than total', {
            code: 'INSUFFICIENT_RECEIVED_AMOUNT',
            detail: {
                receivedAmount: Number(effectiveReceived.toFixed(2)),
                requiredAmount: Number(aaCalculatedTotal.toFixed(2)),
            },
        })
    }

    const changeAmount = Math.max(0, effectiveReceived - aaCalculatedTotal)

    // 更新已付数量
    for (const row of rows) {
        const deductQty = allocationByRowId.get(row.id) ?? 0
        if (deductQty <= 0) continue
        const paidQty = row.paidQuantity ?? 0
        const newPaidQty = paidQty + deductQty
        if (newPaidQty > row.quantity) {
            throw new ConflictError('AA checkout conflict on item quantity')
        }
        await updateOrderItemPaidQuantity(tx, row.id, newPaidQty)
    }

    // 重新查询并计算剩余金额
    const remainingRows = await getOrderItemsByOrderId(tx, order!.id)
    const { fullSubtotal, outstandingSubtotal: remainingSubtotal } = calculateSubtotals(remainingRows)

    const existingTotalAmount = parseMoney((order as { totalAmount?: unknown }).totalAmount ?? 0)
    const existingPaidAmount = parseMoney((order as { paidAmount?: unknown }).paidAmount ?? 0)
    const newTotalAmount = existingTotalAmount > 0 ? existingTotalAmount : fullSubtotal
    const newPaidAmount = existingPaidAmount + aaCalculatedTotal

    // 判断是否全部结清
    let updatedOrder
    if (remainingSubtotal <= epsilon) {
        updatedOrder = await updateOrderStatus(tx, order!.id, {
            status: 'paid',
            subtotal: toMoneyString(fullSubtotal),
            discount: '0',
            total: toMoneyString(newPaidAmount),
            totalAmount: toMoneyString(newTotalAmount),
            paidAmount: toMoneyString(newPaidAmount),
            paymentMethod,
            closedAt: new Date(),
        })
        await resetTableToIdle(tx, tableId)
    } else {
        updatedOrder = await updateOrderStatus(tx, order!.id, {
            status: 'open',
            subtotal: toMoneyString(fullSubtotal),
            discount: '0',
            total: toMoneyString(newPaidAmount),
            totalAmount: toMoneyString(newTotalAmount),
            paidAmount: toMoneyString(newPaidAmount),
            paymentMethod,
            closedAt: null,
        })
        await updateTableStatus(tx, tableId, {
            status: 'occupied',
            amount: toMoneyString(remainingSubtotal),
        })
    }

    // 创建交易记录
    const transactionRow = await createTransaction(tx, {
        type: 'income',
        category: 'POS checkout - AA',
        amount: aaCalculatedTotal,
        description: `POS AA 结账 - 桌台 ${table!.number}`,
        paymentMethod,
        orderId: order!.id,
    })

    // 创建交易明细行
    const transactionItemsToInsert: Array<{
        transactionId: string
        orderItemId: string
        quantity: number
        menuItemId: string
        nameSnapshot: string
        unitPrice: number
    }> = []

    for (const [menuItemId, entry] of itemsByMenuItem.entries()) {
        for (const row of entry.rows) {
            const allocatedQty = allocationByRowId.get(row.id) ?? 0
            if (allocatedQty > 0) {
                transactionItemsToInsert.push({
                    transactionId: transactionRow.id,
                    orderItemId: row.id,
                    quantity: allocatedQty,
                    menuItemId,
                    nameSnapshot: row.name ?? '',
                    unitPrice: row.numericPrice,
                })
            }
        }
    }

    if (transactionItemsToInsert.length > 0) {
        await createTransactionItems(tx, transactionItemsToInsert)
    }

    const batches = buildOrderBatches(remainingRows as OrderItemRow[], { omitFullyPaid: true })

    return {
        order: {
            id: updatedOrder.id,
            tableId: updatedOrder.tableId,
            status: updatedOrder.status,
            subtotal: parseMoney(updatedOrder.subtotal),
            discount: parseMoney(updatedOrder.discount),
            total: parseMoney(updatedOrder.total),
            totalAmount: parseMoney((updatedOrder as { totalAmount?: unknown }).totalAmount),
            paidAmount: parseMoney((updatedOrder as { paidAmount?: unknown }).paidAmount),
            paymentMethod: updatedOrder.paymentMethod ?? null,
            createdAt: updatedOrder.createdAt.toISOString(),
            closedAt: updatedOrder.closedAt ? updatedOrder.closedAt.toISOString() : null,
        },
        batches,
        transaction: transactionRow
            ? {
                id: transactionRow.id,
                type: transactionRow.type,
                category: transactionRow.category,
                amount: parseMoney(transactionRow.amount),
                paymentMethod: transactionRow.paymentMethod,
                orderId: transactionRow.orderId,
                date: normalizeTransactionDate(transactionRow.date),
                createdAt: transactionRow.createdAt.toISOString(),
            }
            : null,
        table: {
            id: table!.id,
            number: table!.number,
        },
        meta: {
            mode: 'aa' as const,
            receivedAmount: Number(effectiveReceived.toFixed(2)),
            changeAmount: Number(changeAmount.toFixed(2)),
        },
    }
}

/**
 * 处理全额结账
 */
async function processFullCheckout(
    tx: Parameters<Parameters<DbClient['transaction']>[0]>[0],
    input: CheckoutInput,
    order: Awaited<ReturnType<typeof getOrderByTableAndId>>,
    table: Awaited<ReturnType<typeof getTableById>>,
    rows: OrderItemRow[]
): Promise<CheckoutResult> {
    const {
        tableId,
        paymentMethod,
        discountPercent = 0,
        clientSubtotal,
        clientTotal,
        receivedAmount,
    } = input

    const epsilon = 0.01
    const { fullSubtotal, outstandingSubtotal } = calculateSubtotals(rows)

    const discountRate = discountPercent > 0 ? discountPercent / 100 : 0
    const discountAmount = outstandingSubtotal * discountRate
    const calculatedTotal = outstandingSubtotal - discountAmount

    // 校验客户端金额
    if (Math.abs(clientSubtotal - outstandingSubtotal) > epsilon) {
        throw new ConflictError(`Client subtotal does not match server subtotal: ${clientSubtotal} vs ${outstandingSubtotal.toFixed(2)}`)
    }

    if (Math.abs(clientTotal - calculatedTotal) > epsilon) {
        throw new ConflictError(`Client total does not match server total: ${clientTotal} vs ${calculatedTotal.toFixed(2)}`)
    }

    const effectiveReceived =
        receivedAmount != null && receivedAmount > 0 ? receivedAmount : calculatedTotal

    if (effectiveReceived + epsilon < calculatedTotal) {
        throw new ValidationError('Received amount is less than total', {
            code: 'INSUFFICIENT_RECEIVED_AMOUNT',
            detail: {
                receivedAmount: Number(effectiveReceived.toFixed(2)),
                requiredAmount: Number(calculatedTotal.toFixed(2)),
            },
        })
    }

    const changeAmount = Math.max(0, effectiveReceived - calculatedTotal)

    const existingTotalAmount = parseMoney((order as { totalAmount?: unknown }).totalAmount ?? 0)
    const existingPaidAmount = parseMoney((order as { paidAmount?: unknown }).paidAmount ?? 0)
    const newTotalAmount = existingTotalAmount > 0 ? existingTotalAmount : fullSubtotal
    const newPaidAmount = existingPaidAmount + calculatedTotal

    // 将所有菜品标记为已付
    const fullyPaidRows: OrderItemRow[] = []
    for (const row of rows) {
        const qty = row.quantity
        fullyPaidRows.push({ ...row, paidQuantity: qty })
        await updateOrderItemPaidQuantity(tx, row.id, qty)
    }

    // 更新订单状态
    const updatedOrder = await updateOrderStatus(tx, order!.id, {
        status: 'paid',
        subtotal: toMoneyString(fullSubtotal),
        discount: toMoneyString(discountAmount),
        total: toMoneyString(newPaidAmount),
        totalAmount: toMoneyString(newTotalAmount),
        paidAmount: toMoneyString(newPaidAmount),
        paymentMethod,
        closedAt: new Date(),
    })

    // 创建交易记录
    const transactionRow = await createTransaction(tx, {
        type: 'income',
        category: 'POS checkout',
        amount: calculatedTotal,
        description: `POS 订单结账 - 桌台 ${table!.number}`,
        paymentMethod,
        orderId: order!.id,
    })

    // 创建交易明细行
    const fullTransactionItems: Array<{
        transactionId: string
        orderItemId: string
        quantity: number
        menuItemId: string
        nameSnapshot: string
        unitPrice: number
    }> = []

    for (const row of rows) {
        const originalPaidQty = row.paidQuantity ?? 0
        const incrementQty = row.quantity - originalPaidQty
        if (incrementQty > 0) {
            fullTransactionItems.push({
                transactionId: transactionRow.id,
                orderItemId: row.id,
                quantity: incrementQty,
                menuItemId: row.menuItemId,
                nameSnapshot: row.name ?? '',
                unitPrice: parseMoney(row.price),
            })
        }
    }

    if (fullTransactionItems.length > 0) {
        await createTransactionItems(tx, fullTransactionItems)
    }

    // 重置桌台状态
    await resetTableToIdle(tx, tableId)

    const batches = buildOrderBatches(fullyPaidRows, { omitFullyPaid: true })

    return {
        order: {
            id: updatedOrder.id,
            tableId: updatedOrder.tableId,
            status: updatedOrder.status,
            subtotal: parseMoney(updatedOrder.subtotal),
            discount: parseMoney(updatedOrder.discount),
            total: parseMoney(updatedOrder.total),
            totalAmount: parseMoney((updatedOrder as { totalAmount?: unknown }).totalAmount),
            paidAmount: parseMoney((updatedOrder as { paidAmount?: unknown }).paidAmount),
            paymentMethod: updatedOrder.paymentMethod ?? null,
            createdAt: updatedOrder.createdAt.toISOString(),
            closedAt: updatedOrder.closedAt ? updatedOrder.closedAt.toISOString() : null,
        },
        batches,
        transaction: transactionRow
            ? {
                id: transactionRow.id,
                type: transactionRow.type,
                category: transactionRow.category,
                amount: parseMoney(transactionRow.amount),
                paymentMethod: transactionRow.paymentMethod,
                orderId: transactionRow.orderId,
                date: normalizeTransactionDate(transactionRow.date),
                createdAt: transactionRow.createdAt.toISOString(),
            }
            : null,
        table: {
            id: table!.id,
            number: table!.number,
        },
        meta: {
            mode: 'full' as const,
            receivedAmount: Number(effectiveReceived.toFixed(2)),
            changeAmount: Number(changeAmount.toFixed(2)),
        },
    }
}

/**
 * 处理结账
 * 
 * @param db - 数据库实例
 * @param input - 结账输入参数
 * @returns 结账结果
 */
export async function processCheckout(
    db: DbClient,
    input: CheckoutInput
): Promise<CheckoutResult> {
    const { tableId, orderId, mode } = input

    return await db.transaction(async (tx) => {
        // 获取桌台
        const table = await getTableById(tx, tableId)
        if (!table) {
            throw new NotFoundError('桌台', tableId)
        }

        // 获取订单
        const order = await getOrderByTableAndId(tx, tableId, orderId)
        if (!order) {
            throw new NotFoundError('订单', orderId)
        }

        if (order.status !== 'open') {
            throw new ConflictError('订单不是打开状态')
        }

        // 获取订单项
        const rows = await getOrderItemsByOrderId(tx, orderId)
        if (rows.length === 0) {
            throw new ValidationError('订单没有菜品', { code: 'ORDER_EMPTY' })
        }

        // 根据模式处理结账
        if (mode === 'aa') {
            return await processAACheckout(tx, input, order, table, rows as OrderItemRow[])
        } else {
            return await processFullCheckout(tx, input, order, table, rows as OrderItemRow[])
        }
    })
}
