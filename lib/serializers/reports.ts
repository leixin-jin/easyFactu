/**
 * 报表 Serializer
 * 
 * 将数据库报表数据转换为 API 响应格式
 */

import { parseMoney } from '@/lib/money'

/**
 * 报表概览 DTO
 */
export interface ReportOverviewDTO {
    totalRevenue: number
    ordersCount: number
    averageOrderValue: number
    periodStart: string
    periodEnd: string
    granularity: string
}

/**
 * 报表明细行 DTO
 */
export interface ReportLineDTO {
    period: string
    revenue: number
    ordersCount: number
}

/**
 * 报表 DTO
 */
export interface ReportDTO {
    overview: ReportOverviewDTO
    lines: ReportLineDTO[]
    categories: Record<string, number>
}

/**
 * 序列化报表概览
 */
export function serializeReportOverview(data: {
    totalRevenue: unknown
    ordersCount: number
    averageOrderValue: unknown
    periodStart: Date | string
    periodEnd: Date | string
    granularity: string
}): ReportOverviewDTO {
    return {
        totalRevenue: parseMoney(data.totalRevenue),
        ordersCount: data.ordersCount,
        averageOrderValue: parseMoney(data.averageOrderValue),
        periodStart: data.periodStart instanceof Date
            ? data.periodStart.toISOString()
            : String(data.periodStart),
        periodEnd: data.periodEnd instanceof Date
            ? data.periodEnd.toISOString()
            : String(data.periodEnd),
        granularity: data.granularity,
    }
}

/**
 * 序列化报表明细行
 */
export function serializeReportLine(data: {
    period: string
    revenue: unknown
    ordersCount: number
}): ReportLineDTO {
    return {
        period: data.period,
        revenue: parseMoney(data.revenue),
        ordersCount: data.ordersCount,
    }
}
