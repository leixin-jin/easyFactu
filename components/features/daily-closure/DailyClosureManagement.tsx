"use client"

import { useMemo } from "react"
import { CreditCard, DollarSign, Lock, RefreshCw, ShoppingBag, Users } from "lucide-react"

import { ApiError } from "@/lib/api"
import { formatMoney } from "@/lib/money"
import { useConfirmDailyClosure, useDailyClosureQuery } from "@/lib/queries"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"

function formatEuro(value: number) {
  return `€${formatMoney(value)}`
}

export function DailyClosureManagement() {
  const { toast } = useToast()

  const query = useDailyClosureQuery()
  const confirm = useConfirmDailyClosure()

  const data = query.data

  const errorMessage = (() => {
    if (!query.error) return null
    if (query.error instanceof ApiError) {
      return `${query.error.code}: ${query.error.message}`
    }
    if (query.error instanceof Error) return query.error.message
    return String(query.error)
  })()

  const revenue = data?.overview.grossRevenue ?? 0
  const averageOrderValue = data?.overview.averageOrderValueGross ?? 0

  // 现金 vs 银行卡比例计算
  const cashTotal = data?.payments.cashActualTotal ?? 0
  const bankTotal = data?.payments.nonCashActualTotal ?? 0
  const paymentTotal = cashTotal + bankTotal
  const cashRatio = paymentTotal > 0 ? Math.round((cashTotal / paymentTotal) * 100) : 0
  const bankRatio = paymentTotal > 0 ? 100 - cashRatio : 0

  // 菜品分类营业额汇总
  const categoryRevenue = useMemo(() => {
    const lines = data?.items.lines ?? []
    const map = new Map<string, number>()
    lines.forEach((line) => {
      const current = map.get(line.category) ?? 0
      map.set(line.category, current + line.revenueAmount)
    })
    return Array.from(map.entries())
      .map(([category, revenueAmount]) => ({ category, revenue: revenueAmount }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [data?.items.lines])

  const handleConfirm = async () => {
    try {
      const result = await confirm.mutateAsync({})
      toast({
        title: "日结确认成功",
        description: `已生成第 ${result.sequenceNo} 份日结报告`,
      })
    } catch (err) {
      toast({
        title: "日结确认失败",
        description: err instanceof Error ? err.message : "未知错误",
        variant: "destructive",
      })
    }
  }

  // 格式化时间显示
  const formatPeriod = (start: string | undefined, end: string | undefined) => {
    if (!start || !end) return "-"
    const startDate = new Date(start)
    const endDate = new Date(end)
    const formatTime = (d: Date) => d.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    })
    return `${formatTime(startDate)} - ${formatTime(endDate)}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground text-balance">日结</h1>
        <p className="text-muted-foreground mt-1">今日经营数据总览</p>
      </div>

      <Card className="p-4 bg-card border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary">{formatPeriod(data?.periodStartAt, data?.periodEndAt)}</Badge>
          <Badge variant="outline" className="bg-transparent">
            预览
          </Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            className="gap-2 bg-transparent"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </Button>
          <Button
            className="gap-2"
            onClick={handleConfirm}
            disabled={confirm.isPending || query.isLoading}
          >
            <Lock className="w-4 h-4" />
            日结确认
          </Button>
        </div>
      </Card>

      {query.isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Card key={idx} className="p-6 bg-card border-border">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="w-12 h-12 rounded-lg" />
                </div>
              </Card>
            ))}
          </div>
          <Card className="bg-card border-border">
            <div className="p-4 border-b border-border">
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="p-4 space-y-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="flex items-center justify-between py-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : errorMessage ? (
        <Card className="p-6 bg-card border-border">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">加载失败</p>
              <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
            </div>
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => query.refetch()}
              disabled={query.isFetching}
            >
              重试
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-6 bg-card border-border">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">营业额</p>
                  <div className="text-2xl font-bold text-foreground">
                    {formatEuro(revenue)}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-primary text-sm">含税</span>
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
                  <p className="text-sm text-muted-foreground">订单数</p>
                  <div className="text-2xl font-bold text-foreground">
                    {data?.overview.ordersCount ?? 0}
                  </div>
                  <div className="flex items-center gap-1">
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
                    {formatEuro(averageOrderValue)}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-primary text-sm">含税</span>
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
                    {cashRatio}% / {bankRatio}%
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-primary text-sm">
                      {formatEuro(cashTotal)} / {formatEuro(bankTotal)}
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-accent" />
                </div>
              </div>
            </Card>
          </div>

          {/* 菜品分类营业额汇总 */}
          <Card className="bg-card border-border">
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">菜品分类营业额</h2>
            </div>
            <ScrollArea className="h-[200px]">
              <div className="p-4 space-y-2">
                {categoryRevenue.length === 0 ? (
                  <p className="text-sm text-muted-foreground">暂无分类数据</p>
                ) : (
                  categoryRevenue.map(({ category, revenue: catRevenue }, index) => (
                    <div key={category ? `cat-${category}` : `uncategorized-${index}`} className="flex items-start justify-between gap-3 py-2">
                      <span className="text-sm text-foreground line-clamp-2 break-words leading-5 flex-1 min-w-0">
                        {category || "未分类"}
                      </span>
                      <span className="text-sm font-medium text-foreground whitespace-nowrap">
                        {formatEuro(catRevenue)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>
      )}
    </div>
  )
}
