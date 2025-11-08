"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Edit, Trash2, MoreVertical, UserCheck, UserX, Phone, Mail } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface Staff {
  id: string
  name: string
  role: string
  phone: string
  email: string
  status: "active" | "inactive"
  salary: number
  joinDate: string
  performance: number
  ordersServed?: number
  revenue?: number
}

const mockStaff: Staff[] = [
  {
    id: "1",
    name: "张经理",
    role: "店长",
    phone: "138****1234",
    email: "zhang@restaurant.com",
    status: "active",
    salary: 6000,
    joinDate: "2023-01-15",
    performance: 95,
    ordersServed: 0,
    revenue: 0,
  },
  {
    id: "2",
    name: "小李",
    role: "服务员",
    phone: "139****5678",
    email: "li@restaurant.com",
    status: "active",
    salary: 3500,
    joinDate: "2023-06-20",
    performance: 88,
    ordersServed: 234,
    revenue: 8765.5,
  },
  {
    id: "3",
    name: "小王",
    role: "服务员",
    phone: "137****9012",
    email: "wang@restaurant.com",
    status: "active",
    salary: 3500,
    joinDate: "2023-08-10",
    performance: 92,
    ordersServed: 198,
    revenue: 7432.8,
  },
  {
    id: "4",
    name: "小张",
    role: "服务员",
    phone: "136****3456",
    email: "zhang2@restaurant.com",
    status: "active",
    salary: 3500,
    joinDate: "2024-02-01",
    performance: 85,
    ordersServed: 167,
    revenue: 6234.2,
  },
  {
    id: "5",
    name: "陈师傅",
    role: "厨师",
    phone: "135****7890",
    email: "chen@restaurant.com",
    status: "active",
    salary: 5500,
    joinDate: "2022-11-05",
    performance: 96,
  },
  {
    id: "6",
    name: "小刘",
    role: "服务员",
    phone: "134****2345",
    email: "liu@restaurant.com",
    status: "inactive",
    salary: 3500,
    joinDate: "2024-05-15",
    performance: 78,
    ordersServed: 89,
    revenue: 3321.5,
  },
]

export function StaffManagement() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterRole, setFilterRole] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [staff, setStaff] = useState(mockStaff)
  const [editDialog, setEditDialog] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [isNewStaff, setIsNewStaff] = useState(false)

  const filteredStaff = staff.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone.includes(searchQuery) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = filterRole === "all" || member.role === filterRole
    const matchesStatus = filterStatus === "all" || member.status === filterStatus
    return matchesSearch && matchesRole && matchesStatus
  })

  const stats = {
    total: staff.length,
    active: staff.filter((s) => s.status === "active").length,
    inactive: staff.filter((s) => s.status === "inactive").length,
    avgPerformance: (staff.reduce((sum, s) => sum + s.performance, 0) / staff.length).toFixed(1),
  }

  const handleEdit = (member: Staff) => {
    setSelectedStaff(member)
    setIsNewStaff(false)
    setEditDialog(true)
  }

  const handleNew = () => {
    setSelectedStaff({
      id: Date.now().toString(),
      name: "",
      role: "服务员",
      phone: "",
      email: "",
      status: "active",
      salary: 3500,
      joinDate: new Date().toISOString().split("T")[0],
      performance: 0,
    })
    setIsNewStaff(true)
    setEditDialog(true)
  }

  const handleSave = () => {
    if (selectedStaff) {
      if (isNewStaff) {
        setStaff([...staff, selectedStaff])
      } else {
        setStaff(staff.map((s) => (s.id === selectedStaff.id ? selectedStaff : s)))
      }
    }
    setEditDialog(false)
  }

  const handleDelete = (id: string) => {
    setStaff(staff.filter((s) => s.id !== id))
  }

  const toggleStatus = (id: string) => {
    setStaff(staff.map((s) => (s.id === id ? { ...s, status: s.status === "active" ? "inactive" : "active" } : s)))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground text-balance">人员管理</h1>
          <p className="text-muted-foreground mt-1">管理员工信息和绩效</p>
        </div>
        <Button className="gap-2" onClick={handleNew}>
          <Plus className="w-4 h-4" />
          添加员工
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-card border-border">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">总员工</p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </div>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">在职</p>
            <p className="text-2xl font-bold text-primary">{stats.active}</p>
          </div>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">离职</p>
            <p className="text-2xl font-bold text-muted-foreground">{stats.inactive}</p>
          </div>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">平均绩效</p>
            <p className="text-2xl font-bold text-accent">{stats.avgPerformance}%</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-card border-border">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索姓名、电话或邮箱..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="职位筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部职位</SelectItem>
              <SelectItem value="店长">店长</SelectItem>
              <SelectItem value="服务员">服务员</SelectItem>
              <SelectItem value="厨师">厨师</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="状态筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="active">在职</SelectItem>
              <SelectItem value="inactive">离职</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Staff list */}
      <Card className="bg-card border-border">
        <ScrollArea className="h-[600px]">
          <div className="p-4 space-y-3">
            {filteredStaff.map((member) => (
              <Card
                key={member.id}
                className={`p-4 bg-muted/30 border-border hover:border-primary/50 transition-colors ${
                  member.status === "inactive" ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <Avatar className="w-16 h-16 flex-shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                      {member.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg text-foreground">{member.name}</h3>
                          <Badge
                            variant="secondary"
                            className={
                              member.status === "active"
                                ? "bg-primary/10 text-primary"
                                : "bg-muted-foreground/20 text-muted-foreground"
                            }
                          >
                            {member.status === "active" ? "在职" : "离职"}
                          </Badge>
                          <Badge variant="secondary" className="bg-accent/10 text-accent">
                            {member.role}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {member.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {member.email}
                          </span>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(member)}>
                            <Edit className="w-4 h-4 mr-2" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleStatus(member.id)}>
                            {member.status === "active" ? (
                              <>
                                <UserX className="w-4 h-4 mr-2" />
                                标记离职
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-4 h-4 mr-2" />
                                恢复在职
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDelete(member.id)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">入职日期</p>
                        <p className="text-sm font-medium text-foreground">{member.joinDate}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">月薪</p>
                        <p className="text-sm font-medium text-foreground">€{member.salary}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">绩效</p>
                        <p className="text-sm font-medium text-accent">{member.performance}%</p>
                      </div>
                      {member.ordersServed !== undefined && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">服务订单</p>
                          <p className="text-sm font-medium text-foreground">{member.ordersServed}</p>
                        </div>
                      )}
                      {member.revenue !== undefined && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">创造营收</p>
                          <p className="text-sm font-medium text-primary">€{member.revenue.toFixed(0)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* Edit/Add Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isNewStaff ? "添加员工" : "编辑员工"}</DialogTitle>
            <DialogDescription>{isNewStaff ? "填写新员工信息" : "修改员工信息"}</DialogDescription>
          </DialogHeader>

          {selectedStaff && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="staff-name">姓名 *</Label>
                <Input
                  id="staff-name"
                  value={selectedStaff.name}
                  onChange={(e) => setSelectedStaff({ ...selectedStaff, name: e.target.value })}
                  placeholder="请输入姓名"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="staff-role">职位 *</Label>
                  <Select
                    value={selectedStaff.role}
                    onValueChange={(value) => setSelectedStaff({ ...selectedStaff, role: value })}
                  >
                    <SelectTrigger id="staff-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="店长">店长</SelectItem>
                      <SelectItem value="服务员">服务员</SelectItem>
                      <SelectItem value="厨师">厨师</SelectItem>
                      <SelectItem value="收银员">收银员</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staff-status">状态</Label>
                  <Select
                    value={selectedStaff.status}
                    onValueChange={(value: "active" | "inactive") =>
                      setSelectedStaff({ ...selectedStaff, status: value })
                    }
                  >
                    <SelectTrigger id="staff-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">在职</SelectItem>
                      <SelectItem value="inactive">离职</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="staff-phone">电话 *</Label>
                  <Input
                    id="staff-phone"
                    value={selectedStaff.phone}
                    onChange={(e) => setSelectedStaff({ ...selectedStaff, phone: e.target.value })}
                    placeholder="138****1234"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staff-email">邮箱</Label>
                  <Input
                    id="staff-email"
                    type="email"
                    value={selectedStaff.email}
                    onChange={(e) => setSelectedStaff({ ...selectedStaff, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="staff-salary">月薪 (€)</Label>
                  <Input
                    id="staff-salary"
                    type="number"
                    value={selectedStaff.salary}
                    onChange={(e) => setSelectedStaff({ ...selectedStaff, salary: Number.parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staff-joinDate">入职日期</Label>
                  <Input
                    id="staff-joinDate"
                    type="date"
                    value={selectedStaff.joinDate}
                    onChange={(e) => setSelectedStaff({ ...selectedStaff, joinDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>{isNewStaff ? "添加" : "保存"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
