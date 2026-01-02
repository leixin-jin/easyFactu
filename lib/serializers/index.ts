/**
 * Serializers 统一导出
 * 
 * 提供所有模块的 DTO 类型和序列化函数
 */

// 订单
export {
    serializeOrder,
    serializeOrderItem,
    type OrderDTO,
    type OrderItemDTO,
    type CheckoutResultDTO,
} from './orders'

// 交易
export {
    serializeTransaction,
    serializeTransactionItem,
    type TransactionDTO,
    type TransactionItemDTO,
} from './transactions'

// 报表
export {
    serializeReportOverview,
    serializeReportLine,
    type ReportDTO,
    type ReportOverviewDTO,
    type ReportLineDTO,
} from './reports'

// 日结
export {
    serializeDailyClosureOverview,
    serializeDailyClosureAdjustment,
    serializeDailyClosureItemLine,
    type DailyClosureDTO,
    type DailyClosureOverviewDTO,
    type DailyClosurePaymentLineDTO,
    type DailyClosureItemLineDTO,
    type DailyClosureAdjustmentDTO,
} from './daily-closures'

// 结账历史
export {
    serializeCheckoutHistoryItem,
    type CheckoutHistoryItemDTO,
} from './checkout-history'
