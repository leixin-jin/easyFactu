/**
 * Order 领域模型单元测试
 */
import { describe, it, expect } from 'vitest'
import {
    canCheckout,
    canCancel,
    canEdit,
    isCompleted,
    calculateOrderTotal,
    calculateUnpaidTotal,
    isEmpty,
    hasItems,
    getTotalItemsCount,
    getUnpaidItems,
    isFullyPaid,
    isPartiallyPaid,
    aggregateItems,
    cloneItem,
    cloneOrder,
    type Order,
    type OrderItem,
} from '@/lib/domain/Order'

describe('Order', () => {
    // 测试用的样例订单
    const createSampleOrder = (overrides: Partial<Order> = {}): Order => ({
        id: 'order-1',
        tableId: 'table-1',
        status: 'pending',
        items: [
            { id: 'oi-1', menuItemId: 'm1', name: '菜品A', price: 10, quantity: 2 },
            { id: 'oi-2', menuItemId: 'm2', name: '菜品B', price: 20, quantity: 1 },
        ],
        createdAt: new Date(),
        ...overrides,
    })

    describe('canCheckout', () => {
        it('open 订单可结账', () => {
            expect(canCheckout(createSampleOrder({ status: 'open' }))).toBe(true)
        })

        it('pending 订单可结账', () => {
            expect(canCheckout(createSampleOrder({ status: 'pending' }))).toBe(true)
        })

        it('served 订单可结账', () => {
            expect(canCheckout(createSampleOrder({ status: 'served' }))).toBe(true)
        })

        it('paid 订单不可结账', () => {
            expect(canCheckout(createSampleOrder({ status: 'paid' }))).toBe(false)
        })

        it('cancelled 订单不可结账', () => {
            expect(canCheckout(createSampleOrder({ status: 'cancelled' }))).toBe(false)
        })
    })

    describe('canCancel', () => {
        it('pending 订单可取消', () => {
            expect(canCancel(createSampleOrder({ status: 'pending' }))).toBe(true)
        })

        it('served 订单可取消', () => {
            expect(canCancel(createSampleOrder({ status: 'served' }))).toBe(true)
        })

        it('paid 订单不可取消', () => {
            expect(canCancel(createSampleOrder({ status: 'paid' }))).toBe(false)
        })

        it('cancelled 订单不可取消', () => {
            expect(canCancel(createSampleOrder({ status: 'cancelled' }))).toBe(false)
        })
    })

    describe('canEdit', () => {
        it('open 订单可编辑', () => {
            expect(canEdit(createSampleOrder({ status: 'open' }))).toBe(true)
        })

        it('pending 订单可编辑', () => {
            expect(canEdit(createSampleOrder({ status: 'pending' }))).toBe(true)
        })

        it('served 订单不可编辑', () => {
            expect(canEdit(createSampleOrder({ status: 'served' }))).toBe(false)
        })

        it('paid 订单不可编辑', () => {
            expect(canEdit(createSampleOrder({ status: 'paid' }))).toBe(false)
        })
    })

    describe('isCompleted', () => {
        it('paid 订单已完成', () => {
            expect(isCompleted(createSampleOrder({ status: 'paid' }))).toBe(true)
        })

        it('cancelled 订单已完成', () => {
            expect(isCompleted(createSampleOrder({ status: 'cancelled' }))).toBe(true)
        })

        it('pending 订单未完成', () => {
            expect(isCompleted(createSampleOrder({ status: 'pending' }))).toBe(false)
        })
    })

    describe('calculateOrderTotal', () => {
        it('应该正确计算总价', () => {
            const order = createSampleOrder()
            expect(calculateOrderTotal(order)).toBe(40) // 10*2 + 20*1
        })

        it('应该处理空订单', () => {
            const order = createSampleOrder({ items: [] })
            expect(calculateOrderTotal(order)).toBe(0)
        })
    })

    describe('calculateUnpaidTotal', () => {
        it('应该计算未支付金额', () => {
            const order = createSampleOrder({
                items: [
                    { id: 'oi-1', menuItemId: 'm1', name: '菜品A', price: 10, quantity: 3, paidQuantity: 1 },
                    { id: 'oi-2', menuItemId: 'm2', name: '菜品B', price: 20, quantity: 2, paidQuantity: 2 },
                ],
            })
            // 未支付: 10*(3-1) + 20*(2-2) = 20
            expect(calculateUnpaidTotal(order)).toBe(20)
        })

        it('应该处理无 paidQuantity 的情况', () => {
            const order = createSampleOrder()
            expect(calculateUnpaidTotal(order)).toBe(40)
        })
    })

    describe('isEmpty / hasItems', () => {
        it('isEmpty 应该正确判断', () => {
            expect(isEmpty(createSampleOrder({ items: [] }))).toBe(true)
            expect(isEmpty(createSampleOrder())).toBe(false)
        })

        it('hasItems 应该正确判断', () => {
            expect(hasItems(createSampleOrder())).toBe(true)
            expect(hasItems(createSampleOrder({ items: [] }))).toBe(false)
        })
    })

    describe('getTotalItemsCount', () => {
        it('应该返回总数量', () => {
            const order = createSampleOrder()
            expect(getTotalItemsCount(order)).toBe(3) // 2 + 1
        })
    })

    describe('getUnpaidItems', () => {
        it('应该返回未支付的商品', () => {
            const order = createSampleOrder({
                items: [
                    { id: 'oi-1', menuItemId: 'm1', name: '菜品A', price: 10, quantity: 2, paidQuantity: 2 },
                    { id: 'oi-2', menuItemId: 'm2', name: '菜品B', price: 20, quantity: 1, paidQuantity: 0 },
                ],
            })
            const unpaid = getUnpaidItems(order)
            expect(unpaid).toHaveLength(1)
            expect(unpaid[0].id).toBe('oi-2')
        })
    })

    describe('isFullyPaid / isPartiallyPaid', () => {
        it('isFullyPaid 应该正确判断', () => {
            const fullyPaid = createSampleOrder({
                items: [
                    { id: 'oi-1', menuItemId: 'm1', name: '菜品A', price: 10, quantity: 2, paidQuantity: 2 },
                ],
            })
            expect(isFullyPaid(fullyPaid)).toBe(true)

            const notFullyPaid = createSampleOrder({
                items: [
                    { id: 'oi-1', menuItemId: 'm1', name: '菜品A', price: 10, quantity: 2, paidQuantity: 1 },
                ],
            })
            expect(isFullyPaid(notFullyPaid)).toBe(false)
        })

        it('isPartiallyPaid 应该正确判断', () => {
            const partiallyPaid = createSampleOrder({
                items: [
                    { id: 'oi-1', menuItemId: 'm1', name: '菜品A', price: 10, quantity: 2, paidQuantity: 1 },
                ],
            })
            expect(isPartiallyPaid(partiallyPaid)).toBe(true)

            const noPaid = createSampleOrder()
            expect(isPartiallyPaid(noPaid)).toBe(false)
        })
    })

    describe('aggregateItems', () => {
        it('应该聚合相同 menuItemId 的商品', () => {
            const items: OrderItem[] = [
                { id: 'oi-1', menuItemId: 'm1', name: '菜品A', price: 10, quantity: 2 },
                { id: 'oi-2', menuItemId: 'm1', name: '菜品A', price: 10, quantity: 3 },
                { id: 'oi-3', menuItemId: 'm2', name: '菜品B', price: 20, quantity: 1 },
            ]
            const aggregated = aggregateItems(items)
            expect(aggregated).toHaveLength(2)

            const m1 = aggregated.find((i) => i.menuItemId === 'm1')
            expect(m1?.quantity).toBe(5)
        })
    })

    describe('clone', () => {
        it('cloneItem 应该创建浅拷贝', () => {
            const item: OrderItem = { id: 'oi-1', menuItemId: 'm1', name: '菜品A', price: 10, quantity: 2 }
            const cloned = cloneItem(item)
            expect(cloned).toEqual(item)
            expect(cloned).not.toBe(item)
        })

        it('cloneOrder 应该创建浅拷贝', () => {
            const order = createSampleOrder()
            const cloned = cloneOrder(order)
            expect(cloned).toEqual(order)
            expect(cloned).not.toBe(order)
            expect(cloned.items).not.toBe(order.items)
        })
    })
})
