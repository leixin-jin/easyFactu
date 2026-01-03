/**
 * Daily Closure 服务单元测试
 *
 * 测试日结相关的计算和服务逻辑
 */
import { describe, it, expect, vi } from 'vitest'
import {
    aggregateIncomeByPaymentMethod,
    buildDailyClosureItems,
    buildDailyClosurePayments,
    calculateDailyClosureOverview,
    inferDailyClosurePaymentGroup,
} from '@/lib/daily-closure/calculate'

describe('Daily Closure 计算', () => {
    describe('calculateDailyClosureOverview', () => {
        it('应该计算当期收入', () => {
            const overview = calculateDailyClosureOverview({
                grossRevenue: 1000,
                ordersCount: 10,
                taxRate: 0.1,
                refundAmount: 0,
                voidAmount: 0,
            })

            expect(overview.grossRevenue).toBe(1000)
            // 净收入 = 毛收入 / (1 + 税率)
            expect(overview.netRevenue).toBeCloseTo(909.09, 2)
        })

        it('应该计算平均客单价', () => {
            const overview = calculateDailyClosureOverview({
                grossRevenue: 500,
                ordersCount: 5,
                taxRate: 0.1,
                refundAmount: 0,
                voidAmount: 0,
            })

            expect(overview.averageOrderValueGross).toBe(100)
            expect(overview.averageOrderValueNet).toBeCloseTo(90.91, 2)
        })

        it('应该统计交易笔数', () => {
            const overview = calculateDailyClosureOverview({
                grossRevenue: 300,
                ordersCount: 15,
                taxRate: 0.1,
                refundAmount: 50,
                voidAmount: 10,
            })

            expect(overview.ordersCount).toBe(15)
        })

        it('应该处理零订单', () => {
            const overview = calculateDailyClosureOverview({
                grossRevenue: 0,
                ordersCount: 0,
                taxRate: 0.1,
                refundAmount: 0,
                voidAmount: 0,
            })

            expect(overview.averageOrderValueGross).toBe(0)
            expect(overview.averageOrderValueNet).toBe(0)
        })
    })

    describe('aggregateIncomeByPaymentMethod', () => {
        it('应该按支付方式聚合', () => {
            const transactions = [
                { paymentMethod: 'cash', amount: 100 },
                { paymentMethod: 'cash', amount: 50 },
                { paymentMethod: 'visa', amount: 200 },
            ]

            const result = aggregateIncomeByPaymentMethod(transactions)

            expect(result).toHaveLength(2)

            const cashLine = result.find((l) => l.paymentMethod === 'cash')
            expect(cashLine?.expectedAmount).toBe(150)

            const visaLine = result.find((l) => l.paymentMethod === 'visa')
            expect(visaLine?.expectedAmount).toBe(200)
        })

        it('应该按金额排序', () => {
            const transactions = [
                { paymentMethod: 'cash', amount: 50 },
                { paymentMethod: 'visa', amount: 200 },
                { paymentMethod: 'mastercard', amount: 100 },
            ]

            const result = aggregateIncomeByPaymentMethod(transactions)

            expect(result[0].paymentMethod).toBe('visa')
            expect(result[1].paymentMethod).toBe('mastercard')
            expect(result[2].paymentMethod).toBe('cash')
        })

        it('应该处理空数组', () => {
            const result = aggregateIncomeByPaymentMethod([])
            expect(result).toEqual([])
        })
    })

    describe('inferDailyClosurePaymentGroup', () => {
        it('应该识别现金支付', () => {
            expect(inferDailyClosurePaymentGroup('cash')).toBe('cash')
            expect(inferDailyClosurePaymentGroup('现金')).toBe('cash')
            expect(inferDailyClosurePaymentGroup('Cash')).toBe('cash')
        })

        it('应该识别卡支付', () => {
            expect(inferDailyClosurePaymentGroup('visa')).toBe('card')
            expect(inferDailyClosurePaymentGroup('mastercard')).toBe('card')
            expect(inferDailyClosurePaymentGroup('Apple Pay')).toBe('card')
            expect(inferDailyClosurePaymentGroup('credit_card')).toBe('card')
        })

        it('应该识别平台支付', () => {
            expect(inferDailyClosurePaymentGroup('UberEats')).toBe('platform')
            expect(inferDailyClosurePaymentGroup('Deliveroo')).toBe('platform')
        })

        it('应该将未知支付方式归类为其他', () => {
            expect(inferDailyClosurePaymentGroup('bank transfer')).toBe('other')
            expect(inferDailyClosurePaymentGroup('crypto')).toBe('other')
        })
    })

    describe('buildDailyClosurePayments', () => {
        it('应该计算各支付方式总额', () => {
            const paymentLines = [
                { paymentMethod: 'cash', paymentGroup: 'cash' as const, expectedAmount: 100 },
                { paymentMethod: 'visa', paymentGroup: 'card' as const, expectedAmount: 200 },
            ]

            const result = buildDailyClosurePayments(paymentLines, [])

            expect(result.expectedTotal).toBe(300)
            expect(result.cashExpectedTotal).toBe(100)
            expect(result.nonCashExpectedTotal).toBe(200)
        })

        it('应该应用调整金额', () => {
            const paymentLines = [
                { paymentMethod: 'cash', paymentGroup: 'cash' as const, expectedAmount: 100 },
            ]
            const adjustments = [
                { paymentMethod: 'cash', amount: -5 },
                { paymentMethod: null, amount: -2 },
            ]

            const result = buildDailyClosurePayments(paymentLines, adjustments)

            expect(result.difference).toBe(-7)
            expect(result.actualTotal).toBe(93)
        })

        it('应该处理空数据', () => {
            const result = buildDailyClosurePayments([], [])

            expect(result.expectedTotal).toBe(0)
            expect(result.actualTotal).toBe(0)
        })
    })

    describe('buildDailyClosureItems', () => {
        it('应该返回分类列表', () => {
            const items = [
                { menuItemId: 'm1', name: 'A', category: '主食', quantitySold: 10, revenueAmount: 100, discountImpactAmount: 0 },
                { menuItemId: 'm2', name: 'B', category: '饮料', quantitySold: 5, revenueAmount: 50, discountImpactAmount: 0 },
            ]

            const result = buildDailyClosureItems(items)

            expect(result.categories).toContain('主食')
            expect(result.categories).toContain('饮料')
        })

        it('应该按收入排序', () => {
            const items = [
                { menuItemId: 'm1', name: 'A', category: '主食', quantitySold: 1, revenueAmount: 50, discountImpactAmount: 0 },
                { menuItemId: 'm2', name: 'B', category: '饮料', quantitySold: 1, revenueAmount: 200, discountImpactAmount: 0 },
                { menuItemId: 'm3', name: 'C', category: '甜点', quantitySold: 1, revenueAmount: 100, discountImpactAmount: 0 },
            ]

            const result = buildDailyClosureItems(items)

            expect(result.lines[0].name).toBe('B')
            expect(result.lines[1].name).toBe('C')
            expect(result.lines[2].name).toBe('A')
        })

        it('应该处理空数据', () => {
            const result = buildDailyClosureItems([])

            expect(result.categories).toEqual([])
            expect(result.lines).toEqual([])
        })
    })
})
