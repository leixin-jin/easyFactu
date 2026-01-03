/**
 * Checkout Service 集成测试
 *
 * 使用 mock 模拟 repository 层，测试服务层业务逻辑
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { processCheckout } from '@/services/orders/checkout'
import { NotFoundError, ConflictError, ValidationError } from '@/lib/http/errors'

// Mock 所有 repository 模块
vi.mock('@/repositories/orders', () => ({
    getOrderByTableAndId: vi.fn(),
    updateOrderStatus: vi.fn(),
}))

vi.mock('@/repositories/order-items', () => ({
    getOrderItemsByOrderId: vi.fn(),
    updateOrderItemPaidQuantity: vi.fn(),
}))

vi.mock('@/repositories/transactions', () => ({
    createTransaction: vi.fn(),
    createTransactionItems: vi.fn(),
}))

vi.mock('@/repositories/tables', () => ({
    getTableById: vi.fn(),
    resetTableToIdle: vi.fn(),
    updateTableStatus: vi.fn(),
}))

// 动态导入以获取 mock 实例
import { getOrderByTableAndId, updateOrderStatus } from '@/repositories/orders'
import { getOrderItemsByOrderId, updateOrderItemPaidQuantity } from '@/repositories/order-items'
import { createTransaction, createTransactionItems } from '@/repositories/transactions'
import { getTableById, resetTableToIdle, updateTableStatus } from '@/repositories/tables'

describe('processCheckout', () => {
    // Mock 数据库客户端
    const mockDb = {
        transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => {
            return await callback({})
        }),
    } as unknown as Parameters<typeof processCheckout>[0]

    const mockTable = {
        id: 'table-1',
        number: '1',
        status: 'occupied',
        capacity: 4,
    }

    const mockOrder = {
        id: 'order-1',
        tableId: 'table-1',
        status: 'open',
        subtotal: '100.00',
        discount: '0.00',
        total: '0.00',
        totalAmount: '0.00',
        paidAmount: '0.00',
        paymentMethod: null,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        closedAt: null,
    }

    const mockOrderItems = [
        {
            id: 'item-1',
            orderId: 'order-1',
            menuItemId: 'm1',
            name: '菜品A',
            nameEn: 'Item A',
            price: '50.00',
            quantity: 2,
            paidQuantity: 0,
            batchNo: 1,
            notes: null,
            createdAt: new Date('2024-01-01T10:00:00Z'),
        },
    ]

    const mockUpdatedOrder = {
        ...mockOrder,
        status: 'paid',
        total: '100.00',
        totalAmount: '100.00',
        paidAmount: '100.00',
        paymentMethod: 'cash',
        closedAt: new Date('2024-01-01T11:00:00Z'),
    }

    const mockTransaction = {
        id: 'txn-1',
        type: 'income',
        category: 'POS checkout',
        amount: '100.00',
        paymentMethod: 'cash',
        orderId: 'order-1',
        date: new Date('2024-01-01T11:00:00Z'),
        createdAt: new Date('2024-01-01T11:00:00Z'),
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('成功场景', () => {
        it('应该成功完成整单结账', async () => {
            // 准备 mock
            vi.mocked(getTableById).mockResolvedValue(mockTable as ReturnType<typeof getTableById> extends Promise<infer T> ? T : never)
            vi.mocked(getOrderByTableAndId).mockResolvedValue(mockOrder as ReturnType<typeof getOrderByTableAndId> extends Promise<infer T> ? T : never)
            vi.mocked(getOrderItemsByOrderId).mockResolvedValue(mockOrderItems as unknown as ReturnType<typeof getOrderItemsByOrderId> extends Promise<infer T> ? T : never)
            vi.mocked(updateOrderStatus).mockResolvedValue(mockUpdatedOrder as unknown as ReturnType<typeof updateOrderStatus> extends Promise<infer T> ? T : never)
            vi.mocked(updateOrderItemPaidQuantity).mockResolvedValue(undefined as unknown as ReturnType<typeof updateOrderItemPaidQuantity> extends Promise<infer T> ? T : never)
            vi.mocked(createTransaction).mockResolvedValue(mockTransaction as unknown as ReturnType<typeof createTransaction> extends Promise<infer T> ? T : never)
            vi.mocked(createTransactionItems).mockResolvedValue(undefined as unknown as ReturnType<typeof createTransactionItems> extends Promise<infer T> ? T : never)
            vi.mocked(resetTableToIdle).mockResolvedValue(undefined)

            const input = {
                tableId: 'table-1',
                orderId: 'order-1',
                mode: 'full' as const,
                paymentMethod: 'cash',
                discountPercent: 0,
                clientSubtotal: 100,
                clientTotal: 100,
                receivedAmount: 100,
            }

            const result = await processCheckout(mockDb, input)

            // 验证结果
            expect(result.order.status).toBe('paid')
            expect(result.meta.mode).toBe('full')
            expect(result.transaction).not.toBeNull()
            expect(result.table.id).toBe('table-1')

            // 验证 repository 调用
            expect(getTableById).toHaveBeenCalled()
            expect(getOrderByTableAndId).toHaveBeenCalled()
            expect(updateOrderStatus).toHaveBeenCalled()
            expect(resetTableToIdle).toHaveBeenCalled()
        })

        it('应该正确计算找零', async () => {
            vi.mocked(getTableById).mockResolvedValue(mockTable as ReturnType<typeof getTableById> extends Promise<infer T> ? T : never)
            vi.mocked(getOrderByTableAndId).mockResolvedValue(mockOrder as ReturnType<typeof getOrderByTableAndId> extends Promise<infer T> ? T : never)
            vi.mocked(getOrderItemsByOrderId).mockResolvedValue(mockOrderItems as unknown as ReturnType<typeof getOrderItemsByOrderId> extends Promise<infer T> ? T : never)
            vi.mocked(updateOrderStatus).mockResolvedValue(mockUpdatedOrder as unknown as ReturnType<typeof updateOrderStatus> extends Promise<infer T> ? T : never)
            vi.mocked(updateOrderItemPaidQuantity).mockResolvedValue(undefined as unknown as ReturnType<typeof updateOrderItemPaidQuantity> extends Promise<infer T> ? T : never)
            vi.mocked(createTransaction).mockResolvedValue(mockTransaction as unknown as ReturnType<typeof createTransaction> extends Promise<infer T> ? T : never)
            vi.mocked(createTransactionItems).mockResolvedValue(undefined as unknown as ReturnType<typeof createTransactionItems> extends Promise<infer T> ? T : never)
            vi.mocked(resetTableToIdle).mockResolvedValue(undefined)

            const input = {
                tableId: 'table-1',
                orderId: 'order-1',
                mode: 'full' as const,
                paymentMethod: 'cash',
                discountPercent: 0,
                clientSubtotal: 100,
                clientTotal: 100,
                receivedAmount: 150,
            }

            const result = await processCheckout(mockDb, input)

            expect(result.meta.receivedAmount).toBe(150)
            expect(result.meta.changeAmount).toBe(50)
        })
    })

    describe('错误场景', () => {
        it('桌台不存在时应该抛出 NotFoundError', async () => {
            vi.mocked(getTableById).mockResolvedValue(null as unknown as ReturnType<typeof getTableById> extends Promise<infer T> ? T : never)

            const input = {
                tableId: 'table-999',
                orderId: 'order-1',
                mode: 'full' as const,
                paymentMethod: 'cash',
                discountPercent: 0,
                clientSubtotal: 100,
                clientTotal: 100,
                receivedAmount: 100,
            }

            await expect(processCheckout(mockDb, input)).rejects.toThrow(NotFoundError)
        })

        it('订单不存在时应该抛出 NotFoundError', async () => {
            vi.mocked(getTableById).mockResolvedValue(mockTable as ReturnType<typeof getTableById> extends Promise<infer T> ? T : never)
            vi.mocked(getOrderByTableAndId).mockResolvedValue(null as unknown as ReturnType<typeof getOrderByTableAndId> extends Promise<infer T> ? T : never)

            const input = {
                tableId: 'table-1',
                orderId: 'order-999',
                mode: 'full' as const,
                paymentMethod: 'cash',
                discountPercent: 0,
                clientSubtotal: 100,
                clientTotal: 100,
                receivedAmount: 100,
            }

            await expect(processCheckout(mockDb, input)).rejects.toThrow(NotFoundError)
        })

        it('订单已结账时应该抛出 ConflictError', async () => {
            vi.mocked(getTableById).mockResolvedValue(mockTable as ReturnType<typeof getTableById> extends Promise<infer T> ? T : never)
            vi.mocked(getOrderByTableAndId).mockResolvedValue({
                ...mockOrder,
                status: 'paid',
            } as ReturnType<typeof getOrderByTableAndId> extends Promise<infer T> ? T : never)

            const input = {
                tableId: 'table-1',
                orderId: 'order-1',
                mode: 'full' as const,
                paymentMethod: 'cash',
                discountPercent: 0,
                clientSubtotal: 100,
                clientTotal: 100,
                receivedAmount: 100,
            }

            await expect(processCheckout(mockDb, input)).rejects.toThrow(ConflictError)
        })

        it('订单无菜品时应该抛出 ValidationError', async () => {
            vi.mocked(getTableById).mockResolvedValue(mockTable as ReturnType<typeof getTableById> extends Promise<infer T> ? T : never)
            vi.mocked(getOrderByTableAndId).mockResolvedValue(mockOrder as ReturnType<typeof getOrderByTableAndId> extends Promise<infer T> ? T : never)
            vi.mocked(getOrderItemsByOrderId).mockResolvedValue([])

            const input = {
                tableId: 'table-1',
                orderId: 'order-1',
                mode: 'full' as const,
                paymentMethod: 'cash',
                discountPercent: 0,
                clientSubtotal: 0,
                clientTotal: 0,
                receivedAmount: 0,
            }

            await expect(processCheckout(mockDb, input)).rejects.toThrow(ValidationError)
        })

        it('收款金额不足时应该抛出 ValidationError', async () => {
            vi.mocked(getTableById).mockResolvedValue(mockTable as ReturnType<typeof getTableById> extends Promise<infer T> ? T : never)
            vi.mocked(getOrderByTableAndId).mockResolvedValue(mockOrder as ReturnType<typeof getOrderByTableAndId> extends Promise<infer T> ? T : never)
            vi.mocked(getOrderItemsByOrderId).mockResolvedValue(mockOrderItems as unknown as ReturnType<typeof getOrderItemsByOrderId> extends Promise<infer T> ? T : never)

            const input = {
                tableId: 'table-1',
                orderId: 'order-1',
                mode: 'full' as const,
                paymentMethod: 'cash',
                discountPercent: 0,
                clientSubtotal: 100,
                clientTotal: 100,
                receivedAmount: 50,
            }

            await expect(processCheckout(mockDb, input)).rejects.toThrow(ValidationError)
        })

        it('客户端金额与服务端不匹配时应该抛出 ConflictError', async () => {
            vi.mocked(getTableById).mockResolvedValue(mockTable as ReturnType<typeof getTableById> extends Promise<infer T> ? T : never)
            vi.mocked(getOrderByTableAndId).mockResolvedValue(mockOrder as ReturnType<typeof getOrderByTableAndId> extends Promise<infer T> ? T : never)
            vi.mocked(getOrderItemsByOrderId).mockResolvedValue(mockOrderItems as unknown as ReturnType<typeof getOrderItemsByOrderId> extends Promise<infer T> ? T : never)

            const input = {
                tableId: 'table-1',
                orderId: 'order-1',
                mode: 'full' as const,
                paymentMethod: 'cash',
                discountPercent: 0,
                clientSubtotal: 200, // 错误的小计
                clientTotal: 200,
                receivedAmount: 200,
            }

            await expect(processCheckout(mockDb, input)).rejects.toThrow(ConflictError)
        })
    })

    describe('AA 结账', () => {
        it('AA 模式无商品时应该抛出 ValidationError', async () => {
            vi.mocked(getTableById).mockResolvedValue(mockTable as ReturnType<typeof getTableById> extends Promise<infer T> ? T : never)
            vi.mocked(getOrderByTableAndId).mockResolvedValue(mockOrder as ReturnType<typeof getOrderByTableAndId> extends Promise<infer T> ? T : never)
            vi.mocked(getOrderItemsByOrderId).mockResolvedValue(mockOrderItems as unknown as ReturnType<typeof getOrderItemsByOrderId> extends Promise<infer T> ? T : never)

            const input = {
                tableId: 'table-1',
                orderId: 'order-1',
                mode: 'aa' as const,
                paymentMethod: 'cash',
                discountPercent: 0,
                clientSubtotal: 50,
                clientTotal: 50,
                receivedAmount: 50,
                aaItems: [],
            }

            await expect(processCheckout(mockDb, input)).rejects.toThrow(ValidationError)
        })

        it('AA 数量超出可用数量时应该抛出 ValidationError', async () => {
            vi.mocked(getTableById).mockResolvedValue(mockTable as ReturnType<typeof getTableById> extends Promise<infer T> ? T : never)
            vi.mocked(getOrderByTableAndId).mockResolvedValue(mockOrder as ReturnType<typeof getOrderByTableAndId> extends Promise<infer T> ? T : never)
            vi.mocked(getOrderItemsByOrderId).mockResolvedValue(mockOrderItems as unknown as ReturnType<typeof getOrderItemsByOrderId> extends Promise<infer T> ? T : never)

            const input = {
                tableId: 'table-1',
                orderId: 'order-1',
                mode: 'aa' as const,
                paymentMethod: 'cash',
                discountPercent: 0,
                clientSubtotal: 250,
                clientTotal: 250,
                receivedAmount: 250,
                aaItems: [
                    { menuItemId: 'm1', quantity: 5, price: 50 }, // 超出可用数量 2
                ],
            }

            await expect(processCheckout(mockDb, input)).rejects.toThrow(ValidationError)
        })
    })
})
