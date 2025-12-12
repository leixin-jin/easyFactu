"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  CreditCard,
  Wallet,
  Plus,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  type Transaction,
  mockTransactions as initialTransactions,
  paymentMethodStats as paymentMethods,
} from "@/lib/mocks"
import { ExpenseDialog } from "@/components/finance/ExpenseDialog"
import { ShiftDialog } from "@/components/finance/ShiftDialog"
import { SettlementDialog } from "@/components/finance/SettlementDialog"
import { InvoiceDialog } from "@/components/finance/InvoiceDialog"
import { RefundDialog } from "@/components/finance/RefundDialog"

export function FinanceManagement() {
  const [transactions, setTransactions] = useState(initialTransactions)
  const [expenseDialog, setExpenseDialog] = useState(false)
  const [shiftDialog, setShiftDialog] = useState(false)
  const [settlementDialog, setSettlementDialog] = useState(false)
  const [invoiceDialog, setInvoiceDialog] = useState(false)
  const [refundDialog, setRefundDialog] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  const totalIncome = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0)
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0)
  const netProfit = totalIncome - totalExpense
  const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : "0.0"

  const handleAddExpense = (expense: Transaction) => {
    setTransactions([expense, ...transactions])
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground text-balance">财务管理</h1>
          <p className="text-muted-foreground mt-1">班次、日结、发票与退款管理</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" className="gap-2 bg-transparent" onClick={() => setShiftDialog(true)}>
            <Wallet className="w-4 h-4" />
            班次管理
          </Button>
          <Button variant="outline" className="gap-2 bg-transparent" onClick={() => setSettlementDialog(true)}>
            <DollarSign className="w-4 h-4" />
            日结
          </Button>
          <Button variant="outline" className="gap-2 bg-transparent" onClick={() => setInvoiceDialog(true)}>
            <FileText className="w-4 h-4" />
            发票
          </Button>
          <Button className="gap-2" onClick={() => setRefundDialog(true)}>
            <ArrowDownRight className="w-4 h-4" />
            退款
          </Button>
        </div>
      </div>

      {/* Tabs for different sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="shifts">班次</TabsTrigger>
          <TabsTrigger value="invoices">发票</TabsTrigger>
          <TabsTrigger value="refunds">退款</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Financial Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-6 bg-card border-border">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">总收入</p>
                  <p className="text-2xl font-bold text-foreground">€{totalIncome.toFixed(2)}</p>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="text-primary text-sm">+12.5%</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <ArrowUpRight className="w-6 h-6 text-primary" />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card border-border">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">总支出</p>
                  <p className="text-2xl font-bold text-foreground">€{totalExpense.toFixed(2)}</p>
                  <div className="flex items-center gap-1">
                    <TrendingDown className="w-4 h-4 text-destructive" />
                    <span className="text-destructive text-sm">+8.2%</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                  <ArrowDownRight className="w-6 h-6 text-destructive" />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card border-border">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">净利润</p>
                  <p className="text-2xl font-bold text-foreground">€{netProfit.toFixed(2)}</p>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="text-primary text-sm">+15.3%</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-accent" />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card border-border">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">利润率</p>
                  <p className="text-2xl font-bold text-foreground">{profitMargin}%</p>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="text-primary text-sm">+2.1%</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-primary" />
                </div>
              </div>
            </Card>
          </div>

          {/* Main content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Transactions */}
            <Card className="lg:col-span-2 bg-card border-border">
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">交易记录</h2>
                  <Badge variant="secondary">{transactions.length} 笔</Badge>
                </div>
              </div>

              <ScrollArea className="h-[500px]">
                <div className="p-6 space-y-3">
                  {transactions.map((transaction) => (
                    <Card
                      key={transaction.id}
                      className="p-4 bg-muted/30 border-border hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              transaction.type === "income" ? "bg-primary/10" : "bg-destructive/10"
                            }`}
                          >
                            {transaction.type === "income" ? (
                              <ArrowUpRight className={`w-5 h-5 text-primary`} />
                            ) : (
                              <ArrowDownRight className={`w-5 h-5 text-destructive`} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-foreground">{transaction.category}</h3>
                                <p className="text-sm text-muted-foreground">{transaction.description}</p>
                              </div>
                              <span
                                className={`text-lg font-bold flex-shrink-0 ${
                                  transaction.type === "income" ? "text-primary" : "text-destructive"
                                }`}
                              >
                                {transaction.type === "income" ? "+" : "-"}€{transaction.amount.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {transaction.date}
                              </span>
                              <span className="flex items-center gap-1">
                                <CreditCard className="w-3 h-3" />
                                {transaction.paymentMethod}
                              </span>
                              {transaction.orderId && (
                                <span className="flex items-center gap-1">
                                  <ShoppingBag className="w-3 h-3" />
                                  {transaction.orderId}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </Card>

            {/* Payment methods & Categories */}
            <div className="space-y-6">
              {/* Payment methods */}
              <Card className="p-6 bg-card border-border">
                <h2 className="text-lg font-semibold text-foreground mb-4">支付方式</h2>
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <div key={method.value} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{method.label}</span>
                        <span className="font-medium text-foreground">€{method.amount.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${(method.amount / 10000) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{method.count}笔</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Expense categories */}
              <Card className="p-6 bg-card border-border">
                <h2 className="text-lg font-semibold text-foreground mb-4">支出分类</h2>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">食材采购</span>
                      <span className="font-medium text-foreground">€2,230</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-destructive rounded-full" style={{ width: "45%" }} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">员工工资</span>
                      <span className="font-medium text-foreground">€4,500</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-destructive rounded-full" style={{ width: "90%" }} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">水电费</span>
                      <span className="font-medium text-foreground">€680</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-destructive rounded-full" style={{ width: "14%" }} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">设备维修</span>
                      <span className="font-medium text-foreground">€450</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-destructive rounded-full" style={{ width: "9%" }} />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Quick stats */}
              <Card className="p-6 bg-card border-border">
                <h2 className="text-lg font-semibold text-foreground mb-4">快速统计</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">今日订单</span>
                    <span className="text-lg font-bold text-foreground">87</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">客单价</span>
                    <span className="text-lg font-bold text-foreground">€37.30</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">翻台率</span>
                    <span className="text-lg font-bold text-foreground">3.2</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="shifts" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6 bg-card border-border">
              <h3 className="text-sm text-muted-foreground mb-2">当前班次</h3>
              <p className="text-2xl font-bold text-foreground mb-4">早班</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">开班时间</span>
                  <span className="text-foreground">08:00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">预期闭班</span>
                  <span className="text-foreground">16:00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">班次小计</span>
                  <span className="text-primary font-bold">€2,450.80</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card border-border">
              <h3 className="text-sm text-muted-foreground mb-2">应收/实收</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">应收</p>
                  <p className="text-2xl font-bold text-foreground">€2,450.80</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">实收</p>
                  <p className="text-2xl font-bold text-primary">€2,450.80</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card border-border">
              <h3 className="text-sm text-muted-foreground mb-2">结账状态</h3>
              <Badge className="bg-primary/10 text-primary mb-4">平账</Badge>
              <p className="text-sm text-muted-foreground">差异: €0.00</p>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6">
          <Card className="p-6 bg-card border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">发票管理</h2>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">支持欧盟IVA税务合规，可生成电子发票（VERI*FACTU生态）</p>
              <Button className="gap-2" onClick={() => setInvoiceDialog(true)}>
                <Plus className="w-4 h-4" />
                开具发票
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="refunds" className="space-y-6">
          <Card className="p-6 bg-card border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">退款管理</h2>
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border">
                    <tr>
                      <th className="text-left p-3 font-medium text-muted-foreground">原单号</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">退款金额</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">原因</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">状态</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border hover:bg-muted/30">
                      <td className="p-3 text-foreground">20251029001</td>
                      <td className="p-3 text-destructive">€50.00</td>
                      <td className="p-3 text-muted-foreground">菜品质量问题</td>
                      <td className="p-3">
                        <Badge className="bg-primary/10 text-primary">已完成</Badge>
                      </td>
                      <td className="p-3">
                        <Button variant="ghost" size="sm">
                          查看
                        </Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <ExpenseDialog
        open={expenseDialog}
        onOpenChange={setExpenseDialog}
        onAddExpense={handleAddExpense}
      />
      <ShiftDialog open={shiftDialog} onOpenChange={setShiftDialog} />
      <SettlementDialog open={settlementDialog} onOpenChange={setSettlementDialog} />
      <InvoiceDialog open={invoiceDialog} onOpenChange={setInvoiceDialog} />
      <RefundDialog open={refundDialog} onOpenChange={setRefundDialog} />
    </div>
  )
}
