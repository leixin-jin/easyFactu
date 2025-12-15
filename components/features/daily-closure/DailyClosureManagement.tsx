"use client"

import { useMemo, useState } from "react"
import { FileDown, Lock, Plus, RefreshCw } from "lucide-react"

import { api, ApiError } from "@/lib/api"
import { formatMoney } from "@/lib/money"
import {
  useConfirmDailyClosure,
  useCreateDailyClosureAdjustment,
  useDailyClosureQuery,
} from "@/lib/queries"
import type { DailyClosureAdjustmentType } from "@/types/api"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

function formatEuro(value: number) {
  return `€${formatMoney(value)}`
}

function labelAdjustmentType(type: DailyClosureAdjustmentType) {
  switch (type) {
    case "fee":
      return "手续费"
    case "rounding":
      return "抹零"
    case "other":
      return "其他"
  }
}

function labelPaymentGroup(group: string) {
  switch (group) {
    case "cash":
      return "现金"
    case "card":
      return "银行卡/电子支付"
    case "platform":
      return "平台"
    default:
      return "其他"
  }
}

function DailyClosureAdjustmentDialog(props: {
  businessDate: string
  closureId: string
  paymentMethods: string[]
  disabled?: boolean
}) {
  const { businessDate, closureId, paymentMethods, disabled } = props
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<DailyClosureAdjustmentType>("fee")
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<string>("unassigned")

  const createAdjustment = useCreateDailyClosureAdjustment()

  const canSubmit =
    !disabled &&
    note.trim().length > 0 &&
    amount.trim().length > 0 &&
    Number.isFinite(Number(amount))

  const handleSubmit = async () => {
    if (!canSubmit) return

    await createAdjustment.mutateAsync({
      closureId,
      businessDate,
      data: {
        type,
        amount: Number(amount),
        note: note.trim(),
        paymentMethod: paymentMethod === "unassigned" ? null : paymentMethod,
      },
    })

    setOpen(false)
    setAmount("")
    setNote("")
    setPaymentMethod("unassigned")
    setType("fee")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 bg-transparent" disabled={disabled}>
          <Plus className="w-4 h-4" />
          补录差额
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>补录差额</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>类型</Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as DailyClosureAdjustmentType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fee">手续费</SelectItem>
                <SelectItem value="rounding">抹零</SelectItem>
                <SelectItem value="other">其他</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>金额（可正可负）</Label>
            <Input
              inputMode="decimal"
              placeholder="-1.23"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>关联支付方式（可选）</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">不关联（计入总差额）</SelectItem>
                {paymentMethods.map((method) => (
                  <SelectItem key={method} value={method}>
                    {method}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>备注（必填）</Label>
            <Textarea
              placeholder="例如：卡手续费、找零抹零、对账差异说明..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            className="bg-transparent"
            onClick={() => setOpen(false)}
          >
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || createAdjustment.isPending}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function DailyClosureManagement() {
  const businessDate = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [activeTab, setActiveTab] = useState("overview")
  const [taxView, setTaxView] = useState<"gross" | "net">("gross")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"revenue" | "quantity">("revenue")

  const query = useDailyClosureQuery(businessDate)
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

  const revenue =
    taxView === "gross" ? data?.overview.grossRevenue ?? 0 : data?.overview.netRevenue ?? 0
  const averageOrderValue =
    taxView === "gross"
      ? data?.overview.averageOrderValueGross ?? 0
      : data?.overview.averageOrderValueNet ?? 0

  const paymentMethods = useMemo(
    () => data?.payments.lines.map((line) => line.paymentMethod) ?? [],
    [data?.payments.lines],
  )

  const filteredItems = useMemo(() => {
    const lines = data?.items.lines ?? []
    const filtered =
      categoryFilter === "all"
        ? lines
        : lines.filter((line) => line.category === categoryFilter)

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "quantity") {
        return b.quantitySold - a.quantitySold
      }
      return b.revenueAmount - a.revenueAmount
    })

    return sorted
  }, [categoryFilter, data?.items.lines, sortBy])

  const handleConfirm = async () => {
    await confirm.mutateAsync({ date: businessDate })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground text-balance">日结</h1>
        <p className="text-muted-foreground mt-1">今日经营总览与锁账导出</p>
      </div>

      <Card className="p-4 bg-card border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{businessDate}</Badge>
          {data?.locked ? (
            <Badge className="gap-1">
              <Lock className="w-3 h-3" />
              已锁账
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-transparent">
              未锁账
            </Badge>
          )}
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
          {data?.locked && data.closureId ? (
            <>
              <Button
                asChild
                variant="outline"
                className="gap-2 bg-transparent"
              >
                <a href={api.dailyClosures.exportUrl(data.closureId, "pdf")}>
                  <FileDown className="w-4 h-4" />
                  导出 PDF
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="gap-2 bg-transparent"
              >
                <a href={api.dailyClosures.exportUrl(data.closureId, "xlsx")}>
                  <FileDown className="w-4 h-4" />
                  导出 Excel
                </a>
              </Button>
            </>
          ) : (
            <Button
              className="gap-2"
              onClick={handleConfirm}
              disabled={confirm.isPending || query.isLoading}
            >
              <Lock className="w-4 h-4" />
              日结确认
            </Button>
          )}
        </div>
      </Card>

      {query.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Card key={idx} className="p-6 bg-card border-border">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32 mt-3" />
              <Skeleton className="h-4 w-20 mt-3" />
            </Card>
          ))}
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">总览</TabsTrigger>
            <TabsTrigger value="payments">入账拆分</TabsTrigger>
            <TabsTrigger value="items">菜品明细</TabsTrigger>
            <TabsTrigger value="lock">锁账与导出</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-muted-foreground">
                {data?.meta?.refundVoidPolicy ?? ""}
              </p>
              <ToggleGroup
                type="single"
                value={taxView}
                onValueChange={(value) => value && setTaxView(value as "gross" | "net")}
                variant="outline"
              >
                <ToggleGroupItem value="gross">含税</ToggleGroupItem>
                <ToggleGroupItem value="net">不含税</ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="p-6 bg-card border-border">
                <p className="text-sm text-muted-foreground">营业额（{taxView === "gross" ? "含税" : "不含税"}）</p>
                <p className="text-2xl font-bold text-foreground mt-2">{formatEuro(revenue)}</p>
              </Card>

              <Card className="p-6 bg-card border-border">
                <p className="text-sm text-muted-foreground">订单数</p>
                <p className="text-2xl font-bold text-foreground mt-2">
                  {data?.overview.ordersCount ?? 0}
                </p>
              </Card>

              <Card className="p-6 bg-card border-border">
                <p className="text-sm text-muted-foreground">
                  客单价（{taxView === "gross" ? "含税" : "不含税"}）
                </p>
                <p className="text-2xl font-bold text-foreground mt-2">
                  {formatEuro(averageOrderValue)}
                </p>
              </Card>

              <Card className="p-6 bg-card border-border">
                <p className="text-sm text-muted-foreground">退款金额</p>
                <p className="text-2xl font-bold text-foreground mt-2">
                  {formatEuro(data?.overview.refundAmount ?? 0)}
                </p>
              </Card>

              <Card className="p-6 bg-card border-border">
                <p className="text-sm text-muted-foreground">作废金额</p>
                <p className="text-2xl font-bold text-foreground mt-2">
                  {formatEuro(data?.overview.voidAmount ?? 0)}
                </p>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-6 bg-card border-border">
                <p className="text-sm text-muted-foreground">现金合计</p>
                <p className="text-2xl font-bold text-foreground mt-2">
                  {formatEuro(data?.payments.cashActualTotal ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  应收 {formatEuro(data?.payments.cashExpectedTotal ?? 0)}
                </p>
              </Card>

              <Card className="p-6 bg-card border-border">
                <p className="text-sm text-muted-foreground">银行卡/电子支付合计</p>
                <p className="text-2xl font-bold text-foreground mt-2">
                  {formatEuro(data?.payments.nonCashActualTotal ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  应收 {formatEuro(data?.payments.nonCashExpectedTotal ?? 0)}
                </p>
              </Card>

              <Card className="p-6 bg-card border-border">
                <p className="text-sm text-muted-foreground">差额（实收 - 应收）</p>
                <p className="text-2xl font-bold text-foreground mt-2">
                  {formatEuro(data?.payments.difference ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  总实收 {formatEuro(data?.payments.actualTotal ?? 0)}
                </p>
              </Card>
            </div>

            <Card className="bg-card border-border">
              <div className="p-6 border-b border-border flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground">按支付方式明细</h2>
                  <Badge variant="secondary">{data?.payments.lines.length ?? 0} 项</Badge>
                </div>
                {data?.locked && data.closureId ? (
                  <DailyClosureAdjustmentDialog
                    businessDate={businessDate}
                    closureId={data.closureId}
                    paymentMethods={paymentMethods}
                  />
                ) : (
                  <DailyClosureAdjustmentDialog
                    businessDate={businessDate}
                    closureId={""}
                    paymentMethods={[]}
                    disabled
                  />
                )}
              </div>

              <ScrollArea className="h-[420px]">
                <div className="p-6 space-y-2">
                  {(data?.payments.lines ?? []).map((line) => (
                    <Card key={line.paymentMethod} className="p-4 bg-muted/30 border-border">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {line.paymentMethod}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {labelPaymentGroup(line.paymentGroup)}
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-sm text-muted-foreground">
                            应收 {formatEuro(line.expectedAmount)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            调整 {formatEuro(line.adjustmentsAmount)}
                          </p>
                          <p className="text-base font-semibold text-foreground">
                            实收 {formatEuro(line.actualAmount)}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="items" className="space-y-6">
            <Card className="p-6 bg-card border-border">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-foreground">按菜品统计</h2>
                  <p className="text-sm text-muted-foreground">
                    展示菜品分类（menu_items.category），支持筛选与排序
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <div className="w-44">
                    <Label htmlFor="daily-closure-category-filter" className="text-xs">
                      分类筛选
                    </Label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger id="daily-closure-category-filter" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部</SelectItem>
                        {(data?.items.categories ?? []).map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-44">
                    <Label htmlFor="daily-closure-sort-by" className="text-xs">
                      排序
                    </Label>
                    <Select
                      value={sortBy}
                      onValueChange={(value) => setSortBy(value as "revenue" | "quantity")}
                    >
                      <SelectTrigger id="daily-closure-sort-by" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="revenue">按营业额</SelectItem>
                        <SelectItem value="quantity">按销量</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="bg-card border-border">
              <div className="p-6 border-b border-border flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground">菜品明细</h2>
                  <Badge variant="secondary">{filteredItems.length} 条</Badge>
                </div>
              </div>

              <ScrollArea className="h-[520px]">
                <div className="p-6 space-y-2">
                  {filteredItems.map((line) => {
                    const avgPrice =
                      line.quantitySold > 0 ? line.revenueAmount / line.quantitySold : 0
                    return (
                      <Card
                        key={`${line.menuItemId ?? "no-id"}-${line.name}`}
                        className="p-4 bg-muted/30 border-border"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{line.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              分类：{line.category}
                            </p>
                          </div>
                          <div className="text-right space-y-1">
                            <p className="text-sm text-muted-foreground">
                              销量 {line.quantitySold}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              均价 {formatEuro(avgPrice)}
                            </p>
                            <p className="text-base font-semibold text-foreground">
                              营业额 {formatEuro(line.revenueAmount)}
                            </p>
                            {line.discountImpactAmount != null &&
                              Math.abs(line.discountImpactAmount) > 0.0001 && (
                                <p className="text-xs text-muted-foreground">
                                  折扣影响 -{formatEuro(line.discountImpactAmount)}
                                </p>
                              )}
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="lock" className="space-y-6">
            <Card className="p-6 bg-card border-border">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-foreground">锁账状态</h2>
                  <p className="text-sm text-muted-foreground">
                    确认后生成不可随意改的日结快照；仍可通过“补录差额”追加说明记录
                  </p>
                </div>
                {!data?.locked ? (
                  <Button className="gap-2" onClick={handleConfirm} disabled={confirm.isPending}>
                    <Lock className="w-4 h-4" />
                    日结确认
                  </Button>
                ) : null}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <Card className="p-4 bg-muted/30 border-border">
                  <p className="text-xs text-muted-foreground">锁账时间</p>
                  <p className="text-sm font-medium text-foreground mt-1">
                    {data?.lockedAt ?? "-"}
                  </p>
                </Card>
                <Card className="p-4 bg-muted/30 border-border">
                  <p className="text-xs text-muted-foreground">日结单号</p>
                  <p className="text-sm font-medium text-foreground mt-1">
                    {data?.closureId ?? "-"}
                  </p>
                </Card>
                <Card className="p-4 bg-muted/30 border-border">
                  <p className="text-xs text-muted-foreground">税率（用于含税/不含税换算）</p>
                  <p className="text-sm font-medium text-foreground mt-1">
                    {data ? `${(data.taxRate * 100).toFixed(2)}%` : "-"}
                  </p>
                </Card>
              </div>

              {data?.locked && data.closureId ? (
                <div className="flex gap-2 flex-wrap mt-6">
                  <Button asChild variant="outline" className="gap-2 bg-transparent">
                    <a href={api.dailyClosures.exportUrl(data.closureId, "pdf")}>
                      <FileDown className="w-4 h-4" />
                      导出 PDF
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="gap-2 bg-transparent">
                    <a href={api.dailyClosures.exportUrl(data.closureId, "xlsx")}>
                      <FileDown className="w-4 h-4" />
                      导出 Excel
                    </a>
                  </Button>
                  <DailyClosureAdjustmentDialog
                    businessDate={businessDate}
                    closureId={data.closureId}
                    paymentMethods={paymentMethods}
                  />
                </div>
              ) : null}
            </Card>

            <Card className="bg-card border-border">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground">差额补录记录</h2>
                  <Badge variant="secondary">{data?.adjustments.length ?? 0} 条</Badge>
                </div>
              </div>

              <ScrollArea className="h-[360px]">
                <div className="p-6 space-y-2">
                  {(data?.adjustments ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">暂无补录记录</p>
                  ) : (
                    data?.adjustments.map((adj) => (
                      <Card key={adj.id} className="p-4 bg-muted/30 border-border">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{adj.note}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {labelAdjustmentType(adj.type)} · {adj.createdAt}
                              {adj.paymentMethod ? ` · ${adj.paymentMethod}` : ""}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-base font-semibold text-foreground">
                              {formatEuro(adj.amount)}
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
      )}
    </div>
  )
}
