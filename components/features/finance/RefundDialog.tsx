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

interface RefundDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RefundDialog({ open, onOpenChange }: RefundDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>申请退款</DialogTitle>
          <DialogDescription>原路退回或部分退款审核</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>原单号</Label>
            <Input placeholder="输入订单号" />
          </div>
          <div className="space-y-2">
            <Label>退款金额</Label>
            <Input type="number" placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label>退款原因</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="选择原因" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quality">菜品质量</SelectItem>
                <SelectItem value="error">订单错误</SelectItem>
                <SelectItem value="customer">客户要求</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full">提交审核</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
