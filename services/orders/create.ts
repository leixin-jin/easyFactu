/**
 * 订单创建服务模块
 *
 * 处理创建订单和添加订单项的业务逻辑
 */

import 'server-only'

import { and, asc, eq, inArray, max } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import type * as schema from '@/db/schema'
import { menuItems, orderItems, orders, restaurantTables } from '@/db/schema'
import { parseMoney, toMoneyString } from '@/lib/money'
import { buildOrderBatches, type OrderItemRow } from '@/lib/order-utils'
import { NotFoundError, ValidationError } from '@/lib/http/errors'
import type { CreateOrderInput } from '@/lib/contracts/orders'

// 数据库类型定义
type DbClient = NodePgDatabase<typeof schema>

/**
 * 订单创建结果
 */
export interface CreateOrderResult {
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
 * 创建订单或添加订单项
 * 
 * @param db - 数据库实例
 * @param input - 创建订单输入
 * @returns 订单创建结果
 */
export async function createOrderOrAddItems(
    db: DbClient,
    input: CreateOrderInput
): Promise<CreateOrderResult> {
    const { tableId, items, paymentMethod } = input

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

        // 桌台一旦有下单行为，状态自动标记为 occupied
        await tx
            .update(restaurantTables)
            .set({ status: 'occupied' })
            .where(eq(restaurantTables.id, tableId))

        // 获取菜品价格
        const menuItemIds = Array.from(new Set(items.map((item) => item.menuItemId)))
        const menuRows = await tx
            .select({
                id: menuItems.id,
                price: menuItems.price,
            })
            .from(menuItems)
            .where(inArray(menuItems.id, menuItemIds))

        const priceById = new Map<string, number>()
        for (const row of menuRows) {
            priceById.set(row.id, parseMoney(row.price))
        }

        // 计算小计
        let itemsSubtotal = 0
        for (const item of items) {
            const unitPrice = priceById.get(item.menuItemId)
            if (unitPrice == null) {
                throw new ValidationError('菜品不存在', {
                    code: 'MENU_ITEM_NOT_FOUND',
                    detail: { menuItemId: item.menuItemId },
                })
            }
            itemsSubtotal += unitPrice * item.quantity
        }

        // 查找现有打开的订单
        const [existingOrder] = await tx
            .select()
            .from(orders)
            .where(and(eq(orders.tableId, tableId), eq(orders.status, 'open')))
            .orderBy(asc(orders.createdAt))
            .limit(1)

        let currentOrder = existingOrder

        if (!currentOrder) {
            // 创建新订单
            const [created] = await tx
                .insert(orders)
                .values({
                    tableId,
                    status: 'open',
                    paymentMethod: paymentMethod ?? null,
                    subtotal: toMoneyString(itemsSubtotal),
                    discount: '0',
                    total: toMoneyString(itemsSubtotal),
                    totalAmount: toMoneyString(itemsSubtotal),
                    paidAmount: '0',
                })
                .returning()

            currentOrder = created
        } else {
            // 更新现有订单金额
            const existingSubtotal = parseMoney(currentOrder.subtotal)
            const existingDiscount = parseMoney(currentOrder.discount)
            const existingTotalAmount = parseMoney(
                (currentOrder as { totalAmount?: unknown }).totalAmount ??
                (currentOrder as { total?: unknown }).total ??
                0
            )

            const newSubtotal = existingSubtotal + itemsSubtotal
            const newTotal = newSubtotal - existingDiscount
            const newTotalAmount = existingTotalAmount + itemsSubtotal
            const newPaymentMethod = paymentMethod ?? currentOrder.paymentMethod

            // 更新订单并获取更新后的记录
            const [updatedOrder] = await tx
                .update(orders)
                .set({
                    subtotal: toMoneyString(newSubtotal),
                    total: toMoneyString(newTotal),
                    totalAmount: toMoneyString(newTotalAmount),
                    paymentMethod: newPaymentMethod,
                })
                .where(eq(orders.id, currentOrder.id))
                .returning()

            // 使用更新后的订单数据
            currentOrder = updatedOrder
        }

        // 获取当前最大批次号
        const [{ maxBatch }] = await tx
            .select({
                maxBatch: max(orderItems.batchNo),
            })
            .from(orderItems)
            .where(eq(orderItems.orderId, currentOrder.id))

        const nextBatchNo = (maxBatch ?? 0) + 1

        // 添加订单项（支持 notes）
        await tx.insert(orderItems).values(
            items.map((item) => {
                const unitPrice = priceById.get(item.menuItemId) ?? 0
                return {
                    orderId: currentOrder.id,
                    menuItemId: item.menuItemId,
                    quantity: item.quantity,
                    price: toMoneyString(unitPrice),
                    notes: item.notes ?? null,
                    batchNo: nextBatchNo,
                }
            })
        )

        // 获取订单项列表
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

        const batches = buildOrderBatches(rows)

        return {
            order: {
                id: currentOrder.id,
                tableId: currentOrder.tableId,
                status: currentOrder.status,
                subtotal:
                    currentOrder.subtotal != null
                        ? parseMoney(currentOrder.subtotal)
                        : 0,
                discount:
                    currentOrder.discount != null
                        ? parseMoney(currentOrder.discount)
                        : 0,
                total:
                    currentOrder.total != null ? parseMoney(currentOrder.total) : 0,
                totalAmount: parseMoney(currentOrder.totalAmount),
                paidAmount: parseMoney(currentOrder.paidAmount),
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

/**
 * 获取桌台的当前订单
 */
export async function getTableOrder(
    db: DbClient,
    tableId: string
): Promise<CreateOrderResult | null> {
    // 验证桌台是否存在
    const [table] = await db
        .select({ id: restaurantTables.id })
        .from(restaurantTables)
        .where(eq(restaurantTables.id, tableId))
        .limit(1)

    if (!table) {
        throw new NotFoundError('桌台', tableId)
    }

    // 查找当前打开的订单
    const [currentOrder] = await db
        .select()
        .from(orders)
        .where(and(eq(orders.tableId, tableId), eq(orders.status, 'open')))
        .orderBy(asc(orders.createdAt))
        .limit(1)

    if (!currentOrder) {
        return null
    }

    // 获取订单项列表
    const rows: OrderItemRow[] = await db
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
            subtotal: parseMoney(currentOrder.subtotal),
            discount: parseMoney(currentOrder.discount),
            total: parseMoney(currentOrder.total),
            totalAmount: parseMoney(currentOrder.totalAmount),
            paidAmount: parseMoney(currentOrder.paidAmount),
            paymentMethod: currentOrder.paymentMethod ?? null,
            createdAt: currentOrder.createdAt.toISOString(),
            closedAt: currentOrder.closedAt
                ? currentOrder.closedAt.toISOString()
                : null,
        },
        batches,
    }
}
