"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, TrendingUp, DollarSign, ShoppingBag, Users, CreditCard } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import { api } from "@/lib/api"
import { formatMoney } from "@/lib/money"
import { useReportsQuery } from "@/lib/queries"
import type { ReportGranularity } from "@/types/api"

import { useToast } from "@/components/ui/use-toast"

export function ReportsView() {
  const { toast } = useToast()
  const [selectedPeriod, setSelectedPeriod] = useState<ReportGranularity>("month")
  const [exporting, setExporting] = useState(false)

  const reportsQuery = useReportsQuery(selectedPeriod)
  const payload = reportsQuery.data

  const kpis = payload?.kpis ?? {
    grossRevenue: 0,
    ordersCount: 0,
    averageOrderValueGross: 0,
    cashAmount: 0,
    bankAmount: 0,
    cashRatio: 0,
    bankRatio: 0,
  }

  const salesTrend = payload?.salesTrend ?? []
  const topItems = payload?.topItems ?? []

  const isEmptyTrend = salesTrend.length === 0 || salesTrend.every((p) => !p.revenue)

  const formatBucketLabel = (bucketIso: string) => {
    const date = new Date(bucketIso)
    if (!Number.isFinite(date.getTime())) return bucketIso

    switch (selectedPeriod) {
      case "day":
        return format(date, "HH:mm")
      case "week":
      case "month":
        return format(date, "MM-dd")
      case "year":
        return format(date, "MM月")
    }
  }

  const formatEuro = (value: number, options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }) =>
    `€${formatMoney(value, options)}`

  const handlePeriodChange = (value: string) => {
    if (value === "day" || value === "week" || value === "month" || value === "year") {
      setSelectedPeriod(value)
    }
  }

  const handleExport = async () => {
    if (exporting) return
    setExporting(true)

    try {
      const url = api.reports.exportUrl(selectedPeriod, "xlsx")
      const response = await fetch(url, { method: "GET" })
      if (!response.ok) {
        const detail = await response.text().catch(() => "")
        throw new Error(detail || `HTTP ${response.status}`)
      }

      const buffer = await response.arrayBuffer()
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })

      const disposition = response.headers.get("Content-Disposition") ?? ""
      const match = disposition.match(/filename=\"?([^\";]+)\"?/i)
      const filename = match?.[1] ?? `reports-${selectedPeriod}.xlsx`

      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = objectUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      toast({
        title: "导出失败",
        description: message || "无法导出报表，请稍后重试",
        variant: "destructive",
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground text-balance">数据报表</h1>
          <p className="text-muted-foreground mt-1">查看经营数据和分析报告</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">本日</SelectItem>
              <SelectItem value="week">本周</SelectItem>
              <SelectItem value="month">本月</SelectItem>
              <SelectItem value="year">本年</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="gap-2 bg-transparent"
            disabled={exporting}
            onClick={handleExport}
          >
            <Download className="w-4 h-4" />
            导出报表
          </Button>
        </div>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 bg-card border-border">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">总营业额</p>
              <div className="text-2xl font-bold text-foreground">
                {reportsQuery.isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  formatEuro(kpis.grossRevenue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                )}
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-primary text-sm">本期</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">总订单数</p>
              <div className="text-2xl font-bold text-foreground">
                {reportsQuery.isLoading ? <Skeleton className="h-8 w-16" /> : kpis.ordersCount}
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-primary text-sm">本期</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-accent" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">客单价</p>
              <div className="text-2xl font-bold text-foreground">
                {reportsQuery.isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  formatEuro(kpis.averageOrderValueGross)
                )}
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-primary text-sm">本期</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">现金 vs 银行</p>
              <div className="text-2xl font-bold text-foreground">
                {reportsQuery.isLoading ? (
                  <Skeleton className="h-8 w-28" />
                ) : (
                  `${Math.round(kpis.cashRatio * 100)}% / ${Math.round(kpis.bankRatio * 100)}%`
                )}
              </div>
              <div className="flex items-center gap-1">
                {reportsQuery.isLoading ? (
                  <Skeleton className="h-4 w-24" />
                ) : (
                  <span className="text-primary text-sm">
                    {formatEuro(kpis.cashAmount, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} /{" "}
                    {formatEuro(kpis.bankAmount, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                )}
              </div>
            </div>
            <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-accent" />
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed reports */}
      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">销售趋势</TabsTrigger>
          <TabsTrigger value="items">热销菜品</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <Card className="p-6 bg-card border-border">
            <h2 className="text-lg font-semibold text-foreground mb-6">营业额趋势</h2>
            {reportsQuery.isLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (
              <div className="relative">
                <ChartContainer
                  config={{
                    revenue: {
                      label: "营业额",
                      color: "hsl(var(--primary))",
                    },
                  }}
                  className="h-[260px] w-full aspect-auto"
                >
                  <LineChart data={salesTrend} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="bucket"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={16}
                      tickFormatter={formatBucketLabel}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      width={56}
                      tickFormatter={(value) =>
                        `€${formatMoney(Number(value), { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                      }
                    />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          labelFormatter={(label) => formatBucketLabel(String(label))}
                          formatter={(value) => (
                            <div className="flex flex-1 justify-between leading-none">
                              <span className="text-muted-foreground">营业额</span>
                              <span className="text-foreground font-mono font-medium tabular-nums">
                                {formatEuro(Number(value))}
                              </span>
                            </div>
                          )}
                        />
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--color-revenue)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
                {isEmptyTrend && (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                    暂无数据
                  </div>
                )}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          <Card className="p-6 bg-card border-border">
            <h2 className="text-lg font-semibold text-foreground mb-6">热销菜品排行</h2>
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {reportsQuery.isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <Card key={index} className="p-4 bg-muted/30 border-border">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-lg font-bold text-primary">#{index + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-4 w-56" />
                        </div>
                      </div>
                    </Card>
                  ))
                ) : topItems.length === 0 ? (
                  <div className="text-sm text-muted-foreground">暂无数据</div>
                ) : (
                  topItems.map((item, index) => (
                    <Card key={`${item.menuItemId ?? item.name}-${index}`} className="p-4 bg-muted/30 border-border">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-lg font-bold text-primary">#{index + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 min-w-0">
                            <h3 className="font-medium text-foreground truncate">{item.name}</h3>
                            <Badge variant="secondary" className="shrink-0">
                              {item.category}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>销量: {item.quantitySold}</span>
                            <span>营收: {formatEuro(item.revenueAmount)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">
                            {formatEuro(item.revenueAmount, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
