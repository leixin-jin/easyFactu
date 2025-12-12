"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Wallet, Download } from "lucide-react"

interface ShiftDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShiftDialog({ open, onOpenChange }: ShiftDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>班次管理</DialogTitle>
          <DialogDescription>开班/闭班/交接班操作</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Button className="w-full gap-2">
            <Plus className="w-4 h-4" />
            开班
          </Button>
          <Button variant="outline" className="w-full gap-2 bg-transparent">
            <Wallet className="w-4 h-4" />
            闭班
          </Button>
          <Button variant="outline" className="w-full gap-2 bg-transparent">
            <Download className="w-4 h-4" />
            打印交接班单
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
