"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, FileText, UtensilsCrossed } from "lucide-react"
import Link from "next/link"

const quickActions = [
  { label: "开台", icon: Plus, href: "/tables", color: "bg-primary" },
  { label: "日结", icon: FileText, href: "/daily-closure", color: "bg-primary" },
  { label: "新增菜品", icon: UtensilsCrossed, href: "/menu", color: "bg-primary" },
]

const tableStatus = [
  { status: "空闲", count: 12, color: "bg-primary" },
  { status: "就餐中", count: 8, color: "bg-destructive" },
  { status: "预订", count: 3, color: "bg-accent" },
  { status: "锁定", count: 2, color: "bg-muted-foreground" },
]

export function DashboardContent() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground text-balance">首页</h1>
        </div>
        {/* Quick action buttons removed from header */}
      </div>

      {/* Alerts section removed as requested */}

      {/* Quick access */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <Link key={action.label} href={action.href}>
              <Card className="p-6 bg-card border-border hover:border-primary/50 transition-all cursor-pointer group">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">{action.label}</h3>
                  <div
                    className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">点击快速访问</p>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Table status overview */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">桌台态势</h2>
          <Link href="/tables">
            <Button variant="ghost" size="sm">
              查看详情
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {tableStatus.map((status) => (
            <div key={status.status} className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${status.color}`} />
                <span className="text-sm text-muted-foreground">{status.status}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{status.count}</p>
            </div>
          ))}
        </div>

        {/* Mini table grid */}
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 25 }).map((_, i) => {
            const status = i < 12 ? "idle" : i < 20 ? "occupied" : i < 23 ? "reserved" : "locked"
            return (
              <Link key={i} href="/tables">
                <div
                  className={`aspect-square rounded-lg border-2 flex items-center justify-center text-xs font-medium transition-colors cursor-pointer ${
                    status === "idle"
                      ? "bg-primary/10 border-primary text-primary hover:bg-primary/20"
                      : status === "occupied"
                        ? "bg-destructive/10 border-destructive text-destructive hover:bg-destructive/20"
                        : status === "reserved"
                          ? "bg-accent/10 border-accent text-accent hover:bg-accent/20"
                          : "bg-muted border-muted-foreground/20 text-muted-foreground"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
              </Link>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
