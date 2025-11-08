"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, TrendingUp, TrendingDown, DollarSign, ShoppingBag, Users, Clock } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

export function ReportsView() {
  const [selectedPeriod, setSelectedPeriod] = useState("month")

  const salesData = [
    { date: "10-23", revenue: 2890, orders: 78 },
    { date: "10-24", revenue: 3120, orders: 85 },
    { date: "10-25", revenue: 2750, orders: 72 },
    { date: "10-26", revenue: 3340, orders: 91 },
    { date: "10-27", revenue: 3120, orders: 84 },
    { date: "10-28", revenue: 2890, orders: 79 },
    { date: "10-29", revenue: 3245, orders: 87 },
  ]

  const topItems = [
    { name: "意式肉酱面", sales: 203, revenue: 3410.4 },
    { name: "凯撒沙拉", sales: 156, revenue: 1950.0 },
    { name: "玛格丽特披萨", sales: 178, revenue: 2581.0 },
    { name: "烤三文鱼", sales: 134, revenue: 3873.6 },
    { name: "提拉米苏", sales: 189, revenue: 1606.5 },
  ]

  const peakHours = [
    { hour: "11:00-12:00", orders: 23, revenue: 856.5 },
    { hour: "12:00-13:00", orders: 45, revenue: 1678.9 },
    { hour: "13:00-14:00", orders: 38, revenue: 1423.2 },
    { hour: "18:00-19:00", orders: 52, revenue: 1945.8 },
    { hour: "19:00-20:00", orders: 67, revenue: 2501.3 },
    { hour: "20:00-21:00", orders: 48, revenue: 1789.6 },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground text-balance">数据报表</h1>
          <p className="text-muted-foreground mt-1">查看经营数据和分析报告</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">今日</SelectItem>
              <SelectItem value="week">本周</SelectItem>
              <SelectItem value="month">本月</SelectItem>
              <SelectItem value="year">本年</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2 bg-transparent">
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
              <p className="text-2xl font-bold text-foreground">€21,355</p>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-primary text-sm">+12.5%</span>
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
              <p className="text-2xl font-bold text-foreground">576</p>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-primary text-sm">+8.2%</span>
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
              <p className="text-2xl font-bold text-foreground">€37.06</p>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-primary text-sm">+3.8%</span>
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
              <p className="text-sm text-muted-foreground">平均翻台时长</p>
              <p className="text-2xl font-bold text-foreground">48分钟</p>
              <div className="flex items-center gap-1">
                <TrendingDown className="w-4 h-4 text-primary" />
                <span className="text-primary text-sm">-5.3%</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-accent" />
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed reports */}
      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">销售趋势</TabsTrigger>
          <TabsTrigger value="items">热销菜品</TabsTrigger>
          <TabsTrigger value="hours">高峰时段</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <Card className="p-6 bg-card border-border">
            <h2 className="text-lg font-semibold text-foreground mb-6">每日销售趋势</h2>
            <div className="space-y-4">
              {salesData.map((day, index) => {
                const maxRevenue = Math.max(...salesData.map((d) => d.revenue))
                const percentage = (day.revenue / maxRevenue) * 100
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground w-20">{day.date}</span>
                      <div className="flex-1 mx-4">
                        <div className="h-8 bg-muted rounded-lg overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-lg flex items-center justify-end px-3"
                            style={{ width: `${percentage}%` }}
                          >
                            <span className="text-xs font-medium text-primary-foreground">{day.orders}单</span>
                          </div>
                        </div>
                      </div>
                      <span className="font-bold text-foreground w-24 text-right">€{day.revenue.toFixed(0)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          <Card className="p-6 bg-card border-border">
            <h2 className="text-lg font-semibold text-foreground mb-6">热销菜品排行</h2>
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {topItems.map((item, index) => (
                  <Card key={index} className="p-4 bg-muted/30 border-border">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-bold text-primary">#{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground mb-1">{item.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>销量: {item.sales}</span>
                          <span>营收: €{item.revenue.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">€{item.revenue.toFixed(0)}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="hours" className="space-y-4">
          <Card className="p-6 bg-card border-border">
            <h2 className="text-lg font-semibold text-foreground mb-6">高峰时段分析</h2>
            <div className="space-y-4">
              {peakHours.map((hour, index) => {
                const maxOrders = Math.max(...peakHours.map((h) => h.orders))
                const percentage = (hour.orders / maxOrders) * 100
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground w-32">{hour.hour}</span>
                      <div className="flex-1 mx-4">
                        <div className="h-8 bg-muted rounded-lg overflow-hidden">
                          <div
                            className="h-full bg-accent rounded-lg flex items-center justify-end px-3"
                            style={{ width: `${percentage}%` }}
                          >
                            <span className="text-xs font-medium text-accent-foreground">{hour.orders}单</span>
                          </div>
                        </div>
                      </div>
                      <span className="font-bold text-foreground w-24 text-right">€{hour.revenue.toFixed(0)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
