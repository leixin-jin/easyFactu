"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

interface SettlementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettlementDialog({ open, onOpenChange }: SettlementDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>日结</DialogTitle>
          <DialogDescription>汇总今日收支，对账与结算</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
            <div className="flex justify-between">
              <span className="text-muted-foreground">应收总额</span>
              <span className="font-bold text-foreground">€2,450.80</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">实收总额</span>
              <span className="font-bold text-foreground">€2,450.80</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between">
              <span className="text-foreground font-semibold">差异</span>
              <span className="font-bold text-primary">€0.00</span>
            </div>
          </div>
          <Button className="w-full">确认日结</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
