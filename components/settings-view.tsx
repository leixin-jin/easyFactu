"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Store, Printer, Save, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type SettingsData = {
  id: string | null
  restaurantName: string
  address: string | null
  phone: string | null
  email: string | null
  taxRate: string
  currency: string
  businessHours: string | null
}

export function SettingsView() {
  // Basic information state
  const [restaurantName, setRestaurantName] = useState("")
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [taxRate, setTaxRate] = useState("10")
  const [currency, setCurrency] = useState("EUR")
  const [businessHours, setBusinessHours] = useState("")

  // Printer settings state
  const [autoPrint, setAutoPrint] = useState(true)
  const [printKitchen, setPrintKitchen] = useState(true)
  const [printReceipt, setPrintReceipt] = useState(true)

  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const { toast } = useToast()

  // Fetch settings on mount
  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch("/api/restaurant-settings")
        if (!response.ok) {
          throw new Error("Failed to fetch settings")
        }
        const data: SettingsData = await response.json()

        setRestaurantName(data.restaurantName || "")
        setAddress(data.address || "")
        setPhone(data.phone || "")
        setEmail(data.email || "")
        // Convert tax rate from decimal (0.1000) to percentage (10)
        const taxRatePercent = (parseFloat(data.taxRate) * 100).toString()
        setTaxRate(taxRatePercent)
        setCurrency(data.currency || "EUR")
        setBusinessHours(data.businessHours || "")
      } catch (error) {
        console.error("Failed to fetch settings:", error)
        toast({
          title: "加载失败",
          description: "无法加载设置信息，请刷新页面重试",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [toast])

  const handleSave = async () => {
    // Validate required fields
    if (!restaurantName.trim()) {
      toast({
        title: "验证失败",
        description: "餐厅名称不能为空",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      // Convert tax rate from percentage (10) to decimal (0.1000)
      const taxRateDecimal = (parseFloat(taxRate) / 100).toFixed(4)

      const response = await fetch("/api/restaurant-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          restaurantName: restaurantName.trim(),
          address: address.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          taxRate: taxRateDecimal,
          currency,
          businessHours: businessHours.trim() || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save settings")
      }

      toast({
        title: "保存成功",
        description: "设置信息已成功保存",
      })
    } catch (error) {
      console.error("Failed to save settings:", error)
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "无法保存设置信息，请重试",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground text-balance">系统设置</h1>
          <p className="text-muted-foreground mt-1">配置餐厅信息和系统参数</p>
        </div>
        <Button className="gap-2" onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isSaving ? "保存中..." : "保存设置"}
        </Button>
      </div>

      {/* Settings tabs - simplified to 2 tabs */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="general" className="gap-2">
            <Store className="w-4 h-4" />
            <span className="hidden sm:inline">基本信息</span>
          </TabsTrigger>
          <TabsTrigger value="printer" className="gap-2">
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">打印设置</span>
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
                <Label htmlFor="restaurant-name">餐厅名称 *</Label>
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
                  value={businessHours}
                  onChange={(e) => setBusinessHours(e.target.value)}
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
      </Tabs>
    </div>
  )
}
