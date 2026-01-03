/**
 * 交易数据访问模块
 *
 * 提供交易表的 CRUD 操作
 * 所有数据库访问都必须经过此模块
 */

import 'server-only'

import { eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import { transactions, transactionItems } from '@/db/schema'
import type * as schema from '@/db/schema'
import { toMoneyString } from '@/lib/money'

// 数据库类型定义
type DbClient = NodePgDatabase<typeof schema>
type TxClient = Parameters<Parameters<DbClient['transaction']>[0]>[0]
type DbOrTx = DbClient | TxClient

/**
 * 创建交易记录
 */
export async function createTransaction(
    db: DbOrTx,
    data: {
        type: 'income' | 'expense'
        category: string
        amount: number
        description?: string
        paymentMethod: string
        orderId?: string | null
    }
) {
    const [transaction] = await db
        .insert(transactions)
        .values({
            type: data.type,
            category: data.category,
            amount: toMoneyString(data.amount),
            description: data.description,
            paymentMethod: data.paymentMethod,
            orderId: data.orderId ?? null,
        })
        .returning()

    return transaction
}

/**
 * 创建交易明细行
 */
export async function createTransactionItems(
    db: DbOrTx,
    items: Array<{
        transactionId: string
        orderItemId: string
        quantity: number
        menuItemId: string
        nameSnapshot: string
        unitPrice: number
    }>
) {
    if (items.length === 0) return

    await db.insert(transactionItems).values(
        items.map((item) => ({
            transactionId: item.transactionId,
            orderItemId: item.orderItemId,
            quantity: item.quantity,
            menuItemId: item.menuItemId,
            nameSnapshot: item.nameSnapshot,
            unitPrice: toMoneyString(item.unitPrice),
        }))
    )
}

/**
 * 根据 ID 获取交易记录
 */
export async function getTransactionById(
    db: DbOrTx,
    transactionId: string
) {
    const [transaction] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, transactionId))
        .limit(1)

    return transaction ?? null
}

/**
 * 根据交易 ID 获取交易明细行
 */
export async function getTransactionItemsByTransactionId(
    db: DbOrTx,
    transactionId: string
) {
    return await db
        .select()
        .from(transactionItems)
        .where(eq(transactionItems.transactionId, transactionId))
}
