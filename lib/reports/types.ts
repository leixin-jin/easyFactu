export type ReportGranularity = "day" | "week" | "month" | "year"

export interface ReportRange {
  granularity: ReportGranularity
  startAt: Date
  endAt: Date
}

export interface ReportKpis {
  grossRevenue: number
  ordersCount: number
  averageOrderValueGross: number
  cashAmount: number
  bankAmount: number
  cashRatio: number
  bankRatio: number
}

export interface ReportSalesTrendPoint {
  bucket: string
  revenue: number
}

export interface ReportTopItem {
  menuItemId: string | null
  name: string
  category: string
  quantitySold: number
  revenueAmount: number
}

export interface ReportsPayload {
  range: {
    granularity: ReportGranularity
    startAt: string
    endAt: string
  }
  kpis: ReportKpis
  salesTrend: ReportSalesTrendPoint[]
  topItems: ReportTopItem[]
}

