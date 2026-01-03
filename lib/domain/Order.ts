/**
 * Order 领域模型
 *
 * 包含订单相关的实体、值对象和业务规则
 * 所有函数均为纯函数，不依赖 React/数据库/网络
 */

// 订单项值对象
export interface OrderItem {
    id: string
    menuItemId: string
    name: string
    nameEn?: string
    price: number
    quantity: number
    paidQuantity?: number
    notes?: string | null
}

// 订单状态
export type OrderStatus = 'open' | 'pending' | 'served' | 'paid' | 'cancelled'

// 订单实体
export interface Order {
    id: string
    tableId: string | null
    status: OrderStatus
    items: OrderItem[]
    createdAt: Date | string
    updatedAt?: Date | string
}

/**
 * 判断订单是否可以结账
 * pending 和 served 状态的订单可结账
 */
export function canCheckout(order: Order): boolean {
    return order.status === 'open' || order.status === 'pending' || order.status === 'served'
}

/**
 * 判断订单是否可以取消
 * 未结账且未取消的订单可取消
 */
export function canCancel(order: Order): boolean {
    return order.status !== 'paid' && order.status !== 'cancelled'
}

/**
 * 判断订单是否可以编辑（添加/删除商品）
 * 只有 open、pending 状态可以编辑
 */
export function canEdit(order: Order): boolean {
    return order.status === 'open' || order.status === 'pending'
}

/**
 * 判断订单是否已完成（已支付或已取消）
 */
export function isCompleted(order: Order): boolean {
    return order.status === 'paid' || order.status === 'cancelled'
}

/**
 * 计算订单总价（不含折扣）
 */
export function calculateOrderTotal(order: Order): number {
    return order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

/**
 * 计算订单未支付金额（用于 AA 场景）
 */
export function calculateUnpaidTotal(order: Order): number {
    return order.items.reduce((sum, item) => {
        const unpaidQty = item.quantity - (item.paidQuantity ?? 0)
        return sum + item.price * Math.max(0, unpaidQty)
    }, 0)
}

/**
 * 判断订单是否为空（无商品）
 */
export function isEmpty(order: Order): boolean {
    return order.items.length === 0
}

/**
 * 判断订单是否有商品
 */
export function hasItems(order: Order): boolean {
    return order.items.length > 0
}

/**
 * 获取订单商品总数量
 */
export function getTotalItemsCount(order: Order): number {
    return order.items.reduce((sum, item) => sum + item.quantity, 0)
}

/**
 * 获取订单未支付的商品项
 */
export function getUnpaidItems(order: Order): OrderItem[] {
    return order.items.filter((item) => {
        const unpaidQty = item.quantity - (item.paidQuantity ?? 0)
        return unpaidQty > 0
    })
}

/**
 * 判断订单是否已全部支付
 */
export function isFullyPaid(order: Order): boolean {
    return order.items.every((item) => {
        const paidQty = item.paidQuantity ?? 0
        return paidQty >= item.quantity
    })
}

/**
 * 判断订单是否部分支付
 */
export function isPartiallyPaid(order: Order): boolean {
    const hasSomePaid = order.items.some((item) => (item.paidQuantity ?? 0) > 0)
    return hasSomePaid && !isFullyPaid(order)
}

/**
 * 聚合相同 menuItemId 的订单项
 * 用于显示合并后的商品列表
 */
export function aggregateItems(items: OrderItem[]): OrderItem[] {
    const map = new Map<string, OrderItem>()

    for (const item of items) {
        const existing = map.get(item.menuItemId)
        if (existing) {
            map.set(item.menuItemId, {
                ...existing,
                quantity: existing.quantity + item.quantity,
                paidQuantity: (existing.paidQuantity ?? 0) + (item.paidQuantity ?? 0),
            })
        } else {
            map.set(item.menuItemId, { ...item })
        }
    }

    return Array.from(map.values())
}

/**
 * 创建订单项的浅拷贝
 */
export function cloneItem(item: OrderItem): OrderItem {
    return { ...item }
}

/**
 * 创建订单的浅拷贝
 */
export function cloneOrder(order: Order): Order {
    return {
        ...order,
        items: order.items.map(cloneItem),
    }
}
