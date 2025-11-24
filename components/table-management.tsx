"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  Grid3x3,
  List,
  DollarSign,
  MoreVertical,
  Edit,
  Trash2,
  Receipt,
  UserPlus,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import {
  type RestaurantTableView as Table,
  type TableStatus,
  useRestaurantTables,
} from "@/hooks/useRestaurantTables"

// NOTE: mock data kept for fallback only. Primary source is API.
const mockTables: Table[] = [
  {
    id: "1",
    number: "A-01",
    area: "大厅A区",
    capacity: 4,
    status: "occupied",
    currentGuests: 4,
    startTime: "18:30",
    duration: "1h 15m",
    amount: 156.8,
    waiter: "小李",
    orderId: "20251029001",
  },
  {
    id: "2",
    number: "A-02",
    area: "大厅A区",
    capacity: 4,
    status: "idle",
  },
  {
    id: "3",
    number: "A-03",
    area: "大厅A区",
    capacity: 2,
    status: "idle",
    currentGuests: 2,
    startTime: "20:00",
    waiter: "小王",
  },
  {
    id: "4",
    number: "A-04",
    area: "大厅A区",
    capacity: 6,
    status: "occupied",
    currentGuests: 5,
    startTime: "19:00",
    duration: "45m",
    amount: 234.5,
    waiter: "小张",
    orderId: "20251029002",
  },
  {
    id: "5",
    number: "A-05",
    area: "大厅A区",
    capacity: 4,
    status: "idle",
  },
  {
    id: "6",
    number: "B-01",
    area: "包厢B区",
    capacity: 8,
    status: "occupied",
    currentGuests: 8,
    startTime: "18:00",
    duration: "1h 45m",
    amount: 568.0,
    waiter: "小刘",
    orderId: "20251029003",
  },
  {
    id: "7",
    number: "B-02",
    area: "包厢B区",
    capacity: 10,
    status: "idle",
    currentGuests: 10,
    startTime: "20:30",
    waiter: "小陈",
  },
  {
    id: "8",
    number: "B-03",
    area: "包厢B区",
    capacity: 6,
    status: "idle",
  },
  {
    id: "9",
    number: "C-01",
    area: "露台C区",
    capacity: 4,
    status: "idle",
  },
  {
    id: "10",
    number: "C-02",
    area: "露台C区",
    capacity: 4,
    status: "occupied",
    currentGuests: 3,
    startTime: "19:15",
    duration: "30m",
    amount: 89.5,
    waiter: "小李",
    orderId: "20251029004",
  },
  {
    id: "11",
    number: "C-03",
    area: "露台C区",
    capacity: 2,
    status: "idle",
  },
  {
    id: "12",
    number: "C-04",
    area: "露台C区",
    capacity: 2,
    status: "idle",
  },
]

const statusConfig = {
  idle: { label: "空闲", color: "bg-primary", textColor: "text-primary", bgColor: "bg-primary/10" },
  occupied: { label: "就餐中", color: "bg-destructive", textColor: "text-destructive", bgColor: "bg-destructive/10" },
}

export function TableManagement() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<TableStatus | "all">("all")
  const [filterArea, setFilterArea] = useState<string>("all")
  // reservation and locking features removed

  const {
    tables,
    loading,
    error,
    reload,
    areas,
    sortedTables,
    groupedTablesByArea,
  } = useRestaurantTables({
    fallback: mockTables,
    filters: {
      search: searchQuery,
      status: filterStatus,
      area: filterArea,
    },
  })

  // Stats and open-table dialog handlers can be reintroduced when needed

  const goToPOS = (table: Table) => {
    router.push(`/pos?tableNumber=${encodeURIComponent(table.number)}`)
  }

  const handleTableAction = (table: Table, action: string) => {
    console.log(`[v0] Action ${action} on table ${table.number}`)
    // Handle table actions
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground text-balance">桌台管理</h1>
          <p className="text-muted-foreground mt-1">实时查看和管理餐厅桌台状态</p>
        </div>
      </div>


      {/* Error & Loading */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50 text-sm text-red-700">
          <div>数据加载失败：{error}</div>
          <Button className="mt-3" variant="outline" onClick={reload}>
            重试
          </Button>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4 bg-card border-border">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索桌号或区域..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as TableStatus | "all")}> 
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="状态筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="idle">空闲</SelectItem>
              <SelectItem value="occupied">就餐中</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterArea} onValueChange={setFilterArea}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="区域筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部区域</SelectItem>
              {areas
                .filter((a) => a !== "all")
                .map((area) => (
                  <SelectItem key={area} value={area}>
                    {area}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <Grid3x3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Tables Grid/List View */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Card key={i} className="h-32 animate-pulse bg-muted" />
          ))}
        </div>
      ) : viewMode === "grid" ? (
        <div className="space-y-6">
          {groupedTablesByArea.map(([areaName, areaTables]) => (
            <div key={areaName} className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground px-1">
                {areaName || "未分区"}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {areaTables.map((table) => {
                  const config = statusConfig[table.status]
                  return (
                    <Card
                      key={table.id}
                      className={`p-4 bg-card border-2 transition-all cursor-pointer hover:shadow-lg ${
                        table.status === "idle"
                          ? "border-primary/30 hover:border-primary"
                          : "border-destructive/30 hover:border-destructive"
                      }`}
                      onClick={() => goToPOS(table)}
                    >
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-xl font-bold text-foreground">{table.number}</h3>
                            <p className="text-xs text-muted-foreground">{table.area}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className={`${config.bgColor} ${config.textColor} border-0`}>
                              {config.label}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {table.status === "idle" && (
                                  <DropdownMenuItem onClick={() => goToPOS(table)}>
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    开台
                                  </DropdownMenuItem>
                                )}
                                {table.status === "occupied" && (
                                  <>
                                    <DropdownMenuItem onClick={() => handleTableAction(table, "checkout")}>
                                      <Receipt className="w-4 h-4 mr-2" />
                                      结账
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleTableAction(table, "transfer")}>
                                      <Edit className="w-4 h-4 mr-2" />
                                      转台
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {/* Locked state removed */}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleTableAction(table, "edit")}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  编辑
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleTableAction(table, "delete")}
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  删除
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Occupied details */}
                        {table.status === "occupied" && (
                          <div className="space-y-2 pt-2 border-t border-border">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                消费金额
                              </span>
                              <span className="text-foreground font-bold">€{table.amount?.toFixed(2)}</span>
                            </div>
                          </div>
                        )}

                        {/* Reserved state removed */}
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="bg-card border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">桌号</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">区域</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">状态</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">金额</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody>
                {sortedTables.map((table) => {
                  const config = statusConfig[table.status]
                  return (
                    <tr
                      key={table.id}
                      className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => goToPOS(table)}
                    >
                      <td className="p-4">
                        <span className="font-medium text-foreground">{table.number}</span>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{table.area}</td>
                      <td className="p-4">
                        <Badge variant="secondary" className={`${config.bgColor} ${config.textColor} border-0`}>
                          {config.label}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm font-medium text-foreground">
                        {table.amount ? `€${table.amount.toFixed(2)}` : "-"}
                      </td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {table.status === "idle" && (
                              <DropdownMenuItem onClick={() => goToPOS(table)}>
                                <UserPlus className="w-4 h-4 mr-2" />
                                开台
                              </DropdownMenuItem>
                            )}
                            {table.status === "occupied" && (
                              <>
                                <DropdownMenuItem onClick={() => handleTableAction(table, "checkout")}>
                                  <Receipt className="w-4 h-4 mr-2" />
                                  结账
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleTableAction(table, "transfer")}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  转台
                                </DropdownMenuItem>
                              </>
                            )}
                            {/* Locked state removed */}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleTableAction(table, "edit")}>
                              <Edit className="w-4 h-4 mr-2" />
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleTableAction(table, "delete")}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Dialog removed in this iteration; POS 跳转仍可用 */}
    </div>
  )
}
