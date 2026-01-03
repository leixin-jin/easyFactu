/**
 * Checkout 领域层单元测试
 */
import { describe, it, expect } from 'vitest'
import {
    calculateCheckoutTotal,
    calculateAASplit,
    calculateCheckoutWithChange,
    calculateAAPersonalTotal,
    validateCheckoutInput,
    isReceivedAmountSufficient,
    calculateShortfall,
    calculateSubtotal,
    calculateDiscount,
    calculateChange,
    calculateItemsCount,
    type CheckoutInput,
} from '@/lib/domain/checkout'

describe('Checkout 领域层', () => {
    describe('calculateCheckoutTotal（从 calculate.ts 导出）', () => {
        it('应该正确计算总价', () => {
            const items = [
                { price: 10, quantity: 2 },
                { price: 5, quantity: 3 },
            ]
            const result = calculateCheckoutTotal(items, 0)
            expect(result.subtotal).toBe(35)
            expect(result.total).toBe(35)
        })

        it('应该正确应用折扣', () => {
            const items = [{ price: 100, quantity: 1 }]
            const result = calculateCheckoutTotal(items, 10)
            expect(result.discount).toBe(10)
            expect(result.total).toBe(90)
        })

        it('应该处理空订单', () => {
            const result = calculateCheckoutTotal([], 0)
            expect(result.total).toBe(0)
        })
    })

    describe('calculateAASplit', () => {
        it('应该平均分摊金额', () => {
            const items = [
                { id: '1', name: 'Item 1', price: 30, quantity: 1 },
                { id: '2', name: 'Item 2', price: 20, quantity: 1 },
            ]
            const result = calculateAASplit(items, 2)
            expect(result.perPersonAmount).toBe(25)
        })

        it('应该处理带折扣的 AA', () => {
            const items = [{ id: '1', name: 'Item 1', price: 100, quantity: 1 }]
            const result = calculateAASplit(items, 4, 20)
            expect(result.perPersonAmount).toBe(20)
        })

        it('应该处理零人数', () => {
            const items = [{ id: '1', name: 'Item 1', price: 100, quantity: 1 }]
            const result = calculateAASplit(items, 0)
            expect(result.perPersonAmount).toBe(0)
        })
    })

    describe('calculateCheckoutWithChange', () => {
        it('应该计算找零', () => {
            const items = [{ price: 35, quantity: 1 }]
            const result = calculateCheckoutWithChange(items, 0, 50)
            expect(result.subtotal).toBe(35)
            expect(result.total).toBe(35)
            expect(result.changeAmount).toBe(15)
        })

        it('应该处理收款不足', () => {
            const items = [{ price: 50, quantity: 1 }]
            const result = calculateCheckoutWithChange(items, 0, 30)
            expect(result.changeAmount).toBe(0)
        })

        it('应该应用折扣后计算找零', () => {
            const items = [{ price: 100, quantity: 1 }]
            const result = calculateCheckoutWithChange(items, 10, 100)
            expect(result.total).toBe(90)
            expect(result.changeAmount).toBe(10)
        })
    })

    describe('calculateAAPersonalTotal', () => {
        it('应该计算个人应付金额', () => {
            const aaItems = [
                { price: 10, quantity: 2 },
                { price: 5, quantity: 1 },
            ]
            const total = calculateAAPersonalTotal(aaItems, 0)
            expect(total).toBe(25)
        })

        it('应该应用折扣', () => {
            const aaItems = [{ price: 100, quantity: 1 }]
            const total = calculateAAPersonalTotal(aaItems, 20)
            expect(total).toBe(80)
        })
    })

    describe('validateCheckoutInput', () => {
        const validInput: CheckoutInput = {
            orderId: 'order-1',
            tableId: 'table-1',
            mode: 'full',
            discountPercent: 10,
            paymentMethod: 'cash',
            receivedAmount: 100,
        }

        it('应该验证有效输入', () => {
            const result = validateCheckoutInput(validInput)
            expect(result.valid).toBe(true)
        })

        it('应该拒绝空 orderId', () => {
            const result = validateCheckoutInput({ ...validInput, orderId: '' })
            expect(result.valid).toBe(false)
            expect(result.error).toContain('订单')
        })

        it('应该拒绝空 tableId', () => {
            const result = validateCheckoutInput({ ...validInput, tableId: '' })
            expect(result.valid).toBe(false)
            expect(result.error).toContain('桌位')
        })

        it('应该拒绝无效 mode', () => {
            const result = validateCheckoutInput({ ...validInput, mode: 'invalid' as 'full' })
            expect(result.valid).toBe(false)
            expect(result.error).toContain('结账模式')
        })

        it('应该拒绝无效折扣', () => {
            const result = validateCheckoutInput({ ...validInput, discountPercent: 150 })
            expect(result.valid).toBe(false)
            expect(result.error).toContain('折扣')
        })

        it('应该拒绝负收款金额', () => {
            const result = validateCheckoutInput({ ...validInput, receivedAmount: -10 })
            expect(result.valid).toBe(false)
            expect(result.error).toContain('收款')
        })

        it('AA 模式应该要求选择商品', () => {
            const result = validateCheckoutInput({ ...validInput, mode: 'aa' })
            expect(result.valid).toBe(false)
            expect(result.error).toContain('AA')
        })

        it('AA 模式有选择商品时应该通过', () => {
            const result = validateCheckoutInput({
                ...validInput,
                mode: 'aa',
                aaItems: [{ orderItemId: 'oi-1', menuItemId: 'm1', name: '菜品', price: 10, quantity: 1 }],
            })
            expect(result.valid).toBe(true)
        })
    })

    describe('isReceivedAmountSufficient', () => {
        it('应该判断收款是否足够', () => {
            expect(isReceivedAmountSufficient(100, 100)).toBe(true)
            expect(isReceivedAmountSufficient(100, 150)).toBe(true)
            expect(isReceivedAmountSufficient(100, 50)).toBe(false)
        })
    })

    describe('calculateShortfall', () => {
        it('应该计算不足金额', () => {
            expect(calculateShortfall(100, 70)).toBe(30)
            expect(calculateShortfall(100, 100)).toBe(0)
            expect(calculateShortfall(100, 150)).toBe(0)
        })
    })

    describe('calculateSubtotal', () => {
        it('应该计算商品小计', () => {
            const items = [
                { price: 10, quantity: 2 },
                { price: 5, quantity: 3 },
            ]
            expect(calculateSubtotal(items)).toBe(35)
        })

        it('应该处理空数组', () => {
            expect(calculateSubtotal([])).toBe(0)
        })
    })

    describe('calculateDiscount', () => {
        it('应该计算折扣金额', () => {
            expect(calculateDiscount(100, 10)).toBe(10)
            expect(calculateDiscount(100, 25)).toBe(25)
        })

        it('应该限制折扣范围在 0-100', () => {
            expect(calculateDiscount(100, -10)).toBe(0)
            expect(calculateDiscount(100, 150)).toBe(100)
        })
    })

    describe('calculateChange', () => {
        it('应该计算找零', () => {
            expect(calculateChange(80, 100)).toBe(20)
        })

        it('应该处理收款不足', () => {
            expect(calculateChange(100, 50)).toBe(0)
        })

        it('应该处理零收款', () => {
            expect(calculateChange(100, 0)).toBe(0)
        })
    })

    describe('calculateItemsCount', () => {
        it('应该计算商品总数', () => {
            const items = [{ quantity: 2 }, { quantity: 3 }, { quantity: 1 }]
            expect(calculateItemsCount(items)).toBe(6)
        })

        it('应该处理空数组', () => {
            expect(calculateItemsCount([])).toBe(0)
        })
    })
})

