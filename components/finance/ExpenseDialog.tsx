"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import type { Transaction } from "@/lib/mocks"

interface ExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddExpense: (expense: Transaction) => void
}

const defaultExpense = {
  category: "食材采购",
  amount: 0,
  description: "",
  paymentMethod: "cash",
}

export function ExpenseDialog({
  open,
  onOpenChange,
  onAddExpense,
}: ExpenseDialogProps) {
  const [newExpense, setNewExpense] = useState(defaultExpense)

  const handleAdd = () => {
    const expense: Transaction = {
      id: Date.now().toString(),
      type: "expense",
      category: newExpense.category,
      amount: newExpense.amount,
      description: newExpense.description,
      date: new Date().toISOString().split("T")[0],
      paymentMethod: newExpense.paymentMethod,
    }
    onAddExpense(expense)
    onOpenChange(false)
    setNewExpense(defaultExpense)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>记录支出</DialogTitle>
          <DialogDescription>添加新的支出记录</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="expense-category">支出类别</Label>
            <Select
              value={newExpense.category}
              onValueChange={(value) =>
                setNewExpense({ ...newExpense, category: value })
              }
            >
              <SelectTrigger id="expense-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="食材采购">食材采购</SelectItem>
                <SelectItem value="员工工资">员工工资</SelectItem>
                <SelectItem value="水电费">水电费</SelectItem>
                <SelectItem value="设备维修">设备维修</SelectItem>
                <SelectItem value="租金">租金</SelectItem>
                <SelectItem value="其他">其他</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-amount">金额 (€)</Label>
            <Input
              id="expense-amount"
              type="number"
              step="0.01"
              value={newExpense.amount}
              onChange={(e) =>
                setNewExpense({
                  ...newExpense,
                  amount: Number.parseFloat(e.target.value),
                })
              }
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-payment">支付方式</Label>
            <Select
              value={newExpense.paymentMethod}
              onValueChange={(value) =>
                setNewExpense({ ...newExpense, paymentMethod: value })
              }
            >
              <SelectTrigger id="expense-payment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">现金</SelectItem>
                <SelectItem value="card">银行卡</SelectItem>
                <SelectItem value="transfer">银行转账</SelectItem>
                <SelectItem value="auto">自动扣款</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-description">备注</Label>
            <Textarea
              id="expense-description"
              value={newExpense.description}
              onChange={(e) =>
                setNewExpense({ ...newExpense, description: e.target.value })
              }
              placeholder="支出说明..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleAdd}>确认添加</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
