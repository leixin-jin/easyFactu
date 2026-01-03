/**
 * Reports 聚合逻辑单元测试
 *
 * 测试报表数据聚合和计算逻辑
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildReportsPayload } from '@/lib/reports/aggregate'

describe('buildReportsPayload', () => {
    // Mock 数据库客户端
    const createMockDb = (mockData: {
        incomeRows?: Array<{ paymentMethod: string; amount: string }>
        ordersCountRow?: { count: number }
        itemRows?: Array<{
            orderId: string
            orderDiscount: string
            menuItemId: string
            name: string
            category: string
            quantity: number
            price: string
        }>
        trendRows?: Array<{ bucket: Date; revenue: string }>
    }) => {
        const { incomeRows = [], ordersCountRow = { count: 0 }, itemRows = [], trendRows = [] } = mockData

        let callCount = 0

        return {
            select: vi.fn(() => ({
                from: vi.fn(() => ({
                    where: vi.fn(() => {
                        callCount++
                        if (callCount === 1) return Promise.resolve(incomeRows)
                        if (callCount === 2) return Promise.resolve([ordersCountRow])
                        if (callCount === 4) {
                            // trend query
                            return {
                                groupBy: vi.fn(() => ({
                                    orderBy: vi.fn(() => Promise.resolve(trendRows)),
                                })),
                            }
                        }
                        return Promise.resolve([])
                    }),
                    innerJoin: vi.fn(() => ({
                        innerJoin: vi.fn(() => ({
                            where: vi.fn(() => {
                                callCount++
                                return Promise.resolve(itemRows)
                            }),
                        })),
                    })),
                })),
            })),
        } as unknown as Parameters<typeof buildReportsPayload>[0]['db']
    }

    describe('按日期范围聚合销售数据', () => {
        it('应该正确计算收入总额', async () => {
            const mockDb = createMockDb({
                incomeRows: [
                    { paymentMethod: 'cash', amount: '100.00' },
                    { paymentMethod: 'visa', amount: '50.00' },
                ],
                ordersCountRow: { count: 2 },
            })

            const result = await buildReportsPayload({
                db: mockDb,
                granularity: 'month',
                now: new Date('2024-01-15T12:00:00Z'),
            })

            expect(result.kpis.grossRevenue).toBe(150)
            expect(result.kpis.ordersCount).toBe(2)
        })

        it('应该正确计算平均客单价', async () => {
            const mockDb = createMockDb({
                incomeRows: [
                    { paymentMethod: 'cash', amount: '100.00' },
                    { paymentMethod: 'cash', amount: '200.00' },
                ],
                ordersCountRow: { count: 3 },
            })

            const result = await buildReportsPayload({
                db: mockDb,
                granularity: 'month',
                now: new Date('2024-01-15T12:00:00Z'),
            })

            expect(result.kpis.grossRevenue).toBe(300)
            expect(result.kpis.averageOrderValueGross).toBe(100)
        })
    })

    describe('按支付方式统计', () => {
        it('应该计算现金与银行卡比例', async () => {
            const mockDb = createMockDb({
                incomeRows: [
                    { paymentMethod: 'cash', amount: '60.00' },
                    { paymentMethod: 'visa', amount: '40.00' },
                ],
                ordersCountRow: { count: 2 },
            })

            const result = await buildReportsPayload({
                db: mockDb,
                granularity: 'month',
                now: new Date('2024-01-15T12:00:00Z'),
            })

            expect(result.kpis.cashAmount).toBe(60)
            expect(result.kpis.bankAmount).toBe(40)
            expect(result.kpis.cashRatio).toBeCloseTo(0.6, 2)
            expect(result.kpis.bankRatio).toBeCloseTo(0.4, 2)
        })
    })

    describe('处理空数据', () => {
        it('应该返回零值', async () => {
            const mockDb = createMockDb({})

            const result = await buildReportsPayload({
                db: mockDb,
                granularity: 'month',
                now: new Date('2024-01-15T12:00:00Z'),
            })

            expect(result.kpis.grossRevenue).toBe(0)
            expect(result.kpis.ordersCount).toBe(0)
            expect(result.kpis.averageOrderValueGross).toBe(0)
        })
    })

    describe('时间范围', () => {
        it('月粒度应该返回正确的时间范围', async () => {
            const mockDb = createMockDb({})

            const result = await buildReportsPayload({
                db: mockDb,
                granularity: 'month',
                now: new Date('2024-01-15T12:00:00Z'),
            })

            expect(result.range.granularity).toBe('month')
            // 验证返回的是有效的 ISO 日期字符串
            expect(new Date(result.range.startAt).getTime()).not.toBeNaN()
            expect(new Date(result.range.endAt).getTime()).not.toBeNaN()
        })

        it('周粒度应该返回正确的时间范围', async () => {
            const mockDb = createMockDb({})

            const result = await buildReportsPayload({
                db: mockDb,
                granularity: 'week',
                now: new Date('2024-01-15T12:00:00Z'),
            })

            expect(result.range.granularity).toBe('week')
        })

        it('日粒度应该返回正确的时间范围', async () => {
            const mockDb = createMockDb({})

            const result = await buildReportsPayload({
                db: mockDb,
                granularity: 'day',
                now: new Date('2024-01-15T12:00:00Z'),
            })

            expect(result.range.granularity).toBe('day')
        })
    })
})
