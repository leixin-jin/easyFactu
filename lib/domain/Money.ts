/**
 * Money 值对象
 *
 * 使用分/cents 为单位存储金额，避免浮点精度问题
 * 所有运算均为纯函数，不依赖外部状态
 */

// 货币值对象接口
export interface Money {
    readonly cents: number
}

/**
 * 从欧元创建 Money 对象
 * @param euros - 欧元金额（如 12.34）
 * @returns Money 值对象
 */
export function money(euros: number): Money {
    return { cents: Math.round(euros * 100) }
}

/**
 * 从分创建 Money 对象
 * @param cents - 分/cents 金额
 * @returns Money 值对象
 */
export function moneyFromCents(cents: number): Money {
    return { cents }
}

/**
 * 两个 Money 对象相加
 */
export function add(a: Money, b: Money): Money {
    return { cents: a.cents + b.cents }
}

/**
 * 两个 Money 对象相减
 */
export function subtract(a: Money, b: Money): Money {
    return { cents: a.cents - b.cents }
}

/**
 * Money 对象乘以系数
 */
export function multiply(m: Money, factor: number): Money {
    return { cents: Math.round(m.cents * factor) }
}

/**
 * Money 对象除以除数
 */
export function divide(m: Money, divisor: number): Money {
    if (divisor === 0) {
        return { cents: 0 }
    }
    return { cents: Math.round(m.cents / divisor) }
}

/**
 * 将 Money 转换为数值（欧元）
 */
export function toNumber(m: Money): number {
    return m.cents / 100
}

/**
 * 格式化为欧元字符串
 * @param m - Money 值对象
 * @returns 格式化字符串，如 "€12.34"
 */
export function format(m: Money): string {
    return `€${toNumber(m).toFixed(2)}`
}

/**
 * 是否为零
 */
export function isZero(m: Money): boolean {
    return m.cents === 0
}

/**
 * 是否为正数
 */
export function isPositive(m: Money): boolean {
    return m.cents > 0
}

/**
 * 是否为负数
 */
export function isNegative(m: Money): boolean {
    return m.cents < 0
}

/**
 * 两个 Money 对象是否相等
 */
export function equals(a: Money, b: Money): boolean {
    return a.cents === b.cents
}

/**
 * 比较两个 Money 对象
 * @returns -1 如果 a < b, 0 如果 a === b, 1 如果 a > b
 */
export function compare(a: Money, b: Money): -1 | 0 | 1 {
    if (a.cents < b.cents) return -1
    if (a.cents > b.cents) return 1
    return 0
}

/**
 * 返回较大的 Money 对象
 */
export function max(a: Money, b: Money): Money {
    return compare(a, b) >= 0 ? a : b
}

/**
 * 返回较小的 Money 对象
 */
export function min(a: Money, b: Money): Money {
    return compare(a, b) <= 0 ? a : b
}

/**
 * 求和多个 Money 对象
 */
export function sum(values: Money[]): Money {
    return values.reduce((acc, v) => add(acc, v), { cents: 0 })
}

/**
 * 计算金额的百分比
 * @param m - Money 值对象
 * @param percent - 百分比（0-100）
 * @returns 百分比金额
 */
export function percent(m: Money, pct: number): Money {
    return { cents: Math.round((m.cents * pct) / 100) }
}
