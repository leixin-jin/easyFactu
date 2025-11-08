"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Store, Printer, Bell, Globe, Shield, Database, Palette, Save, RefreshCw, Download, Upload } from "lucide-react"

export function SettingsView() {
  const [restaurantName, setRestaurantName] = useState("意式餐厅")
  const [address, setAddress] = useState("123 Main Street, City")
  const [phone, setPhone] = useState("+1 234 567 8900")
  const [email, setEmail] = useState("info@restaurant.com")
  const [taxRate, setTaxRate] = useState("10")
  const [currency, setCurrency] = useState("EUR")
  const [language, setLanguage] = useState("zh-CN")
  const [timezone, setTimezone] = useState("Europe/Berlin")

  const [autoPrint, setAutoPrint] = useState(true)
  const [printKitchen, setPrintKitchen] = useState(true)
  const [printReceipt, setPrintReceipt] = useState(true)

  const [emailNotifications, setEmailNotifications] = useState(true)
  const [orderNotifications, setOrderNotifications] = useState(true)
  const [lowStockAlerts, setLowStockAlerts] = useState(true)

  const [darkMode, setDarkMode] = useState(false)
  const [compactMode, setCompactMode] = useState(false)

  const handleSave = () => {
    console.log("[v0] Saving settings...")
    // Save settings logic
  }

  const handleBackup = () => {
    console.log("[v0] Creating backup...")
    // Backup logic
  }

  const handleRestore = () => {
    console.log("[v0] Restoring from backup...")
    // Restore logic
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground text-balance">系统设置</h1>
          <p className="text-muted-foreground mt-1">配置餐厅信息和系统参数</p>
        </div>
        <Button className="gap-2" onClick={handleSave}>
          <Save className="w-4 h-4" />
          保存设置
        </Button>
      </div>

      {/* Settings tabs */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
          <TabsTrigger value="general" className="gap-2">
            <Store className="w-4 h-4" />
            <span className="hidden sm:inline">基本信息</span>
          </TabsTrigger>
          <TabsTrigger value="printer" className="gap-2">
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">打印设置</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">通知</span>
          </TabsTrigger>
          <TabsTrigger value="localization" className="gap-2">
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">本地化</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="w-4 h-4" />
            <span className="hidden sm:inline">外观</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <Database className="w-4 h-4" />
            <span className="hidden sm:inline">系统</span>
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center gap-2 mb-6">
              <Store className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">餐厅基本信息</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="restaurant-name">餐厅名称</Label>
                <Input
                  id="restaurant-name"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  placeholder="请输入餐厅名称"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">地址</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="请输入餐厅地址"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">联系电话</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 234 567 8900"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">电子邮箱</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="info@restaurant.com"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tax-rate">税率 (%)</Label>
                  <Input
                    id="tax-rate"
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    placeholder="10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">货币</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="CNY">CNY (¥)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="business-hours">营业时间</Label>
                <Textarea
                  id="business-hours"
                  placeholder="周一至周五: 11:00 - 22:00&#10;周六至周日: 10:00 - 23:00"
                  rows={3}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Printer Settings */}
        <TabsContent value="printer" className="space-y-4">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center gap-2 mb-6">
              <Printer className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">打印机配置</h2>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-print">自动打印</Label>
                  <p className="text-sm text-muted-foreground">订单确认后自动打印</p>
                </div>
                <Switch id="auto-print" checked={autoPrint} onCheckedChange={setAutoPrint} />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="print-kitchen">厨房打印</Label>
                  <p className="text-sm text-muted-foreground">向厨房打印订单</p>
                </div>
                <Switch id="print-kitchen" checked={printKitchen} onCheckedChange={setPrintKitchen} />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="print-receipt">收据打印</Label>
                  <p className="text-sm text-muted-foreground">结账时打印收据</p>
                </div>
                <Switch id="print-receipt" checked={printReceipt} onCheckedChange={setPrintReceipt} />
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="printer-name">打印机名称</Label>
                  <Input id="printer-name" placeholder="默认打印机" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paper-size">纸张尺寸</Label>
                  <Select defaultValue="80mm">
                    <SelectTrigger id="paper-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="58mm">58mm</SelectItem>
                      <SelectItem value="80mm">80mm</SelectItem>
                      <SelectItem value="a4">A4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button variant="outline" className="w-full gap-2 bg-transparent">
                  <Printer className="w-4 h-4" />
                  测试打印
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-4">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center gap-2 mb-6">
              <Bell className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">通知设置</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">邮件通知</Label>
                  <p className="text-sm text-muted-foreground">接收系统邮件通知</p>
                </div>
                <Switch id="email-notifications" checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="order-notifications">订单通知</Label>
                  <p className="text-sm text-muted-foreground">新订单提醒</p>
                </div>
                <Switch id="order-notifications" checked={orderNotifications} onCheckedChange={setOrderNotifications} />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="low-stock-alerts">库存预警</Label>
                  <p className="text-sm text-muted-foreground">库存不足时提醒</p>
                </div>
                <Switch id="low-stock-alerts" checked={lowStockAlerts} onCheckedChange={setLowStockAlerts} />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="notification-email">通知邮箱</Label>
                <Input id="notification-email" type="email" placeholder="notifications@restaurant.com" />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Localization */}
        <TabsContent value="localization" className="space-y-4">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center gap-2 mb-6">
              <Globe className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">本地化设置</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="language">语言</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zh-CN">简体中文</SelectItem>
                    <SelectItem value="en-US">English (US)</SelectItem>
                    <SelectItem value="de-DE">Deutsch</SelectItem>
                    <SelectItem value="fr-FR">Français</SelectItem>
                    <SelectItem value="es-ES">Español</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">时区</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Europe/Berlin">Europe/Berlin (GMT+1)</SelectItem>
                    <SelectItem value="America/New_York">America/New York (GMT-5)</SelectItem>
                    <SelectItem value="Asia/Shanghai">Asia/Shanghai (GMT+8)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Asia/Tokyo (GMT+9)</SelectItem>
                    <SelectItem value="Europe/London">Europe/London (GMT+0)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date-format">日期格式</Label>
                <Select defaultValue="yyyy-mm-dd">
                  <SelectTrigger id="date-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                    <SelectItem value="dd-mm-yyyy">DD-MM-YYYY</SelectItem>
                    <SelectItem value="mm-dd-yyyy">MM-DD-YYYY</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time-format">时间格式</Label>
                <Select defaultValue="24h">
                  <SelectTrigger id="time-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">24小时制</SelectItem>
                    <SelectItem value="12h">12小时制</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Appearance */}
        <TabsContent value="appearance" className="space-y-4">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center gap-2 mb-6">
              <Palette className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">外观设置</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="dark-mode">深色模式</Label>
                  <p className="text-sm text-muted-foreground">使用深色主题</p>
                </div>
                <Switch id="dark-mode" checked={darkMode} onCheckedChange={setDarkMode} />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="compact-mode">紧凑模式</Label>
                  <p className="text-sm text-muted-foreground">减少界面间距</p>
                </div>
                <Switch id="compact-mode" checked={compactMode} onCheckedChange={setCompactMode} />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>主题色</Label>
                <div className="grid grid-cols-6 gap-2">
                  {["#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#f59e0b", "#ec4899"].map((color) => (
                    <button
                      key={color}
                      className="w-full aspect-square rounded-lg border-2 border-border hover:border-primary transition-colors"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="font-size">字体大小</Label>
                <Select defaultValue="medium">
                  <SelectTrigger id="font-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">小</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="large">大</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* System */}
        <TabsContent value="system" className="space-y-4">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center gap-2 mb-6">
              <Database className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">系统管理</h2>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <h3 className="font-medium text-foreground mb-2">数据备份</h3>
                <p className="text-sm text-muted-foreground mb-4">定期备份系统数据以防数据丢失</p>
                <div className="flex gap-2">
                  <Button variant="outline" className="gap-2 bg-transparent" onClick={handleBackup}>
                    <Download className="w-4 h-4" />
                    创建备份
                  </Button>
                  <Button variant="outline" className="gap-2 bg-transparent" onClick={handleRestore}>
                    <Upload className="w-4 h-4" />
                    恢复备份
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-muted/30 rounded-lg">
                <h3 className="font-medium text-foreground mb-2">系统信息</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">版本</span>
                    <span className="text-foreground font-medium">v1.0.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">数据库</span>
                    <span className="text-foreground font-medium">PostgreSQL 15</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">最后备份</span>
                    <span className="text-foreground font-medium">2025-10-29 08:00</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted/30 rounded-lg">
                <h3 className="font-medium text-foreground mb-2">缓存管理</h3>
                <p className="text-sm text-muted-foreground mb-4">清除系统缓存以提升性能</p>
                <Button variant="outline" className="gap-2 bg-transparent">
                  <RefreshCw className="w-4 h-4" />
                  清除缓存
                </Button>
              </div>

              <Separator />

              <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-destructive mb-1">危险操作</h3>
                    <p className="text-sm text-muted-foreground mb-3">以下操作不可逆，请谨慎操作</p>
                    <Button variant="destructive" size="sm">
                      重置系统
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
