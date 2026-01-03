/**
 * Money 值对象单元测试
 */
import { describe, it, expect } from 'vitest'
import {
    money,
    moneyFromCents,
    add,
    subtract,
    multiply,
    divide,
    toNumber,
    format,
    isZero,
    isPositive,
    isNegative,
    equals,
    compare,
    max,
    min,
    sum,
    percent,
} from '@/lib/domain/Money'

describe('Money', () => {
    describe('创建', () => {
        it('money 应该正确将欧元转换为分', () => {
            expect(money(12.34).cents).toBe(1234)
            expect(money(0).cents).toBe(0)
            expect(money(100).cents).toBe(10000)
        })

        it('money 应该四舍五入处理小数精度', () => {
            expect(money(10.999).cents).toBe(1100)
            expect(money(10.994).cents).toBe(1099)
            expect(money(10.995).cents).toBe(1100)
        })

        it('money 应该正确处理负数', () => {
            expect(money(-10.5).cents).toBe(-1050)
        })

        it('moneyFromCents 应该直接使用分值', () => {
            expect(moneyFromCents(1234).cents).toBe(1234)
            expect(moneyFromCents(0).cents).toBe(0)
            expect(moneyFromCents(-100).cents).toBe(-100)
        })
    })

    describe('运算', () => {
        it('add 应该正确相加', () => {
            expect(add(money(10), money(5)).cents).toBe(1500)
            expect(add(money(0), money(0)).cents).toBe(0)
            expect(add(money(-5), money(10)).cents).toBe(500)
        })

        it('subtract 应该正确相减', () => {
            expect(subtract(money(10), money(3)).cents).toBe(700)
            expect(subtract(money(5), money(10)).cents).toBe(-500)
        })

        it('multiply 应该正确乘法并四舍五入', () => {
            expect(multiply(money(10), 3).cents).toBe(3000)
            expect(multiply(money(10), 0).cents).toBe(0)
            expect(multiply(money(10), 0.5).cents).toBe(500)
            expect(multiply(money(10), 1.5).cents).toBe(1500)
        })

        it('divide 应该正确除法并四舍五入', () => {
            expect(divide(money(10), 3).cents).toBe(333)
            expect(divide(money(10), 2).cents).toBe(500)
            expect(divide(money(10), 4).cents).toBe(250)
        })

        it('divide 应该处理除以零', () => {
            expect(divide(money(10), 0).cents).toBe(0)
        })
    })

    describe('转换', () => {
        it('toNumber 应该正确转换为欧元数值', () => {
            expect(toNumber(money(12.34))).toBe(12.34)
            expect(toNumber(moneyFromCents(1234))).toBe(12.34)
            expect(toNumber(money(0))).toBe(0)
        })
    })

    describe('格式化', () => {
        it('format 应该返回欧元格式', () => {
            expect(format(money(12.34))).toBe('€12.34')
            expect(format(money(0))).toBe('€0.00')
            expect(format(money(1000))).toBe('€1000.00')
        })

        it('format 应该处理负数', () => {
            expect(format(money(-12.34))).toBe('€-12.34')
        })
    })

    describe('比较', () => {
        it('isZero 应该正确判断零', () => {
            expect(isZero(money(0))).toBe(true)
            // 0.001 欧元 = 0.1 分，四舍五入后为 0 分
            expect(isZero(money(0.001))).toBe(true)
            expect(isZero(money(0.01))).toBe(false) // 0.01 欧元 = 1 分
            expect(isZero(money(1))).toBe(false)
        })

        it('isPositive 应该正确判断正数', () => {
            expect(isPositive(money(10))).toBe(true)
            expect(isPositive(money(0))).toBe(false)
            expect(isPositive(money(-10))).toBe(false)
        })

        it('isNegative 应该正确判断负数', () => {
            expect(isNegative(money(-10))).toBe(true)
            expect(isNegative(money(0))).toBe(false)
            expect(isNegative(money(10))).toBe(false)
        })

        it('equals 应该正确比较', () => {
            expect(equals(money(10), money(10))).toBe(true)
            expect(equals(money(10), money(20))).toBe(false)
        })

        it('compare 应该正确比较大小', () => {
            expect(compare(money(10), money(20))).toBe(-1)
            expect(compare(money(20), money(10))).toBe(1)
            expect(compare(money(10), money(10))).toBe(0)
        })
    })

    describe('最大/最小值', () => {
        it('max 应该返回较大值', () => {
            expect(max(money(10), money(20)).cents).toBe(2000)
            expect(max(money(20), money(10)).cents).toBe(2000)
        })

        it('min 应该返回较小值', () => {
            expect(min(money(10), money(20)).cents).toBe(1000)
            expect(min(money(20), money(10)).cents).toBe(1000)
        })
    })

    describe('求和', () => {
        it('sum 应该正确求和', () => {
            expect(sum([money(10), money(20), money(30)]).cents).toBe(6000)
        })

        it('sum 应该处理空数组', () => {
            expect(sum([]).cents).toBe(0)
        })
    })

    describe('百分比', () => {
        it('percent 应该正确计算百分比', () => {
            expect(percent(money(100), 10).cents).toBe(1000)
            expect(percent(money(100), 50).cents).toBe(5000)
            expect(percent(money(100), 100).cents).toBe(10000)
        })

        it('percent 应该处理零百分比', () => {
            expect(percent(money(100), 0).cents).toBe(0)
        })
    })
})
