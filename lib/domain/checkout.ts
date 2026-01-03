/**
 * Checkout 领域层
 *
 * 结账计算的核心业务逻辑
 * 从 lib/checkout/calculate.ts 导出核心函数，并添加领域层类型定义
 *
 * 领域层原则：
 * - ❌ 不依赖 React
 * - ❌ 不依赖数据库
 * - ❌ 不依赖 HTTP/网络
 * - ✅ 纯函数
 * - ✅ 可独立单元测试
 */

// 重新导出核心计算函数
export {
    calculateCheckoutTotal,
    calculateAASplit,
    type CheckoutItem,
    type CheckoutResult,
    type AAAllocationItem,
    type AASplitResult,
} from '@/lib/checkout/calculate'

// 领域层类型定义

/**
 * 结账输入（领域层视图）
 */
export interface CheckoutInput {
    /** 订单 ID */
    orderId: string
    /** 桌位 ID */
    tableId: string
    /** 结账模式 */
    mode: 'full' | 'aa'
    /** 折扣百分比 (0-100) */
    discountPercent: number
    /** 支付方式 */
    paymentMethod: string
    /** 收款金额 */
    receivedAmount: number
    /** AA 模式下选中的商品 */
    aaItems?: AACheckoutItem[]
}

/**
 * AA 结账商品项
 */
export interface AACheckoutItem {
    /** 订单项 ID */
    orderItemId: string
    /** 菜品 ID */
    menuItemId: string
    /** 菜品名称 */
    name: string
    /** 单价 */
    price: number
    /** 本次结账数量 */
    quantity: number
}

/**
 * 结账计算结果
 */
export interface CheckoutCalculation {
    /** 小计（折前金额） */
    subtotal: number
    /** 折扣金额 */
    discount: number
    /** 应付总额 */
    total: number
    /** 收款金额 */
    receivedAmount: number
    /** 找零金额 */
    changeAmount: number
}

/**
 * 计算结账金额（包含找零）
 * @param items - 商品列表
 * @param discountPercent - 折扣百分比
 * @param receivedAmount - 收款金额
 * @returns 结账计算结果
 */
export function calculateCheckoutWithChange(
    items: { price: number; quantity: number }[],
    discountPercent: number,
    receivedAmount: number,
): CheckoutCalculation {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const discountRate = Math.max(0, Math.min(100, discountPercent)) / 100
    const discount = subtotal * discountRate
    const total = Math.max(0, subtotal - discount)
    const changeAmount = Math.max(0, receivedAmount - total)

    return {
        subtotal,
        discount,
        total,
        receivedAmount,
        changeAmount,
    }
}

/**
 * 计算 AA 个人结账金额
 * @param aaItems - AA 选中的商品
 * @param discountPercent - 折扣百分比
 * @returns 个人应付金额
 */
export function calculateAAPersonalTotal(
    aaItems: { price: number; quantity: number }[],
    discountPercent: number,
): number {
    const subtotal = aaItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const discountRate = Math.max(0, Math.min(100, discountPercent)) / 100
    const discount = subtotal * discountRate
    return Math.max(0, subtotal - discount)
}

/**
 * 验证结账输入
 * @param input - 结账输入
 * @returns 验证结果
 */
export function validateCheckoutInput(input: CheckoutInput): { valid: boolean; error?: string } {
    if (!input.orderId) {
        return { valid: false, error: '订单 ID 不能为空' }
    }

    if (!input.tableId) {
        return { valid: false, error: '桌位 ID 不能为空' }
    }

    if (input.mode !== 'full' && input.mode !== 'aa') {
        return { valid: false, error: '无效的结账模式' }
    }

    if (input.discountPercent < 0 || input.discountPercent > 100) {
        return { valid: false, error: '折扣百分比必须在 0-100 之间' }
    }

    if (input.receivedAmount < 0) {
        return { valid: false, error: '收款金额不能为负数' }
    }

    if (input.mode === 'aa' && (!input.aaItems || input.aaItems.length === 0)) {
        return { valid: false, error: 'AA 模式必须选择至少一个商品' }
    }

    return { valid: true }
}

/**
 * 判断收款金额是否足够
 */
export function isReceivedAmountSufficient(total: number, receivedAmount: number): boolean {
    return receivedAmount >= total
}

/**
 * 计算不足金额
 */
export function calculateShortfall(total: number, receivedAmount: number): number {
    return Math.max(0, total - receivedAmount)
}

/**
 * 计算商品小计
 * @param items - 包含 price 和 quantity 的商品数组
 * @returns 小计金额
 */
export function calculateSubtotal(items: { price: number; quantity: number }[]): number {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

/**
 * 计算折扣金额
 * @param subtotal - 小计
 * @param discountPercent - 折扣百分比 (0-100)
 * @returns 折扣金额
 */
export function calculateDiscount(subtotal: number, discountPercent: number): number {
    const rate = Math.max(0, Math.min(100, discountPercent)) / 100
    return subtotal * rate
}

/**
 * 计算找零金额
 * @param total - 应付金额
 * @param receivedAmount - 收款金额
 * @returns 找零金额
 */
export function calculateChange(total: number, receivedAmount: number): number {
    return receivedAmount > 0 ? Math.max(0, receivedAmount - total) : 0
}

/**
 * 计算商品总数量
 * @param items - 包含 quantity 的商品数组
 * @returns 总数量
 */
export function calculateItemsCount(items: { quantity: number }[]): number {
    return items.reduce((sum, item) => sum + item.quantity, 0)
}

