"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Download } from "lucide-react"

interface InvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InvoiceDialog({ open, onOpenChange }: InvoiceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>开具发票</DialogTitle>
          <DialogDescription>支持欧盟IVA税务合规</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>发票抬头</Label>
            <Input placeholder="公司名称" />
          </div>
          <div className="space-y-2">
            <Label>税号 (NIF/VAT)</Label>
            <Input placeholder="输入税号" />
          </div>
          <div className="space-y-2">
            <Label>税率</Label>
            <Select defaultValue="21">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="21">21% (标准)</SelectItem>
                <SelectItem value="10">10% (减低)</SelectItem>
                <SelectItem value="4">4% (超减低)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full gap-2">
            <Download className="w-4 h-4" />
            生成并下载
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
