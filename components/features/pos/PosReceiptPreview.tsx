"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { CheckoutReceiptData } from "@/types/pos"

export interface PosReceiptPreviewProps {
  data: CheckoutReceiptData
  onClose: () => void
  onPrint: () => void
}

export function PosReceiptPreview({ data, onClose, onPrint }: PosReceiptPreviewProps) {
  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background text-foreground p-4 print:static print:inset-auto print:p-0 print:bg-white print:text-black">
        <Card className="w-full max-w-sm border-border shadow-lg print:w-[80mm] print:max-w-none print:shadow-none print:border-0 print:rounded-none print:mx-auto pos-receipt-card">
          <div className="p-4 space-y-2 print:p-3">
            <div className="text-center pos-receipt-section">
              <h2 className="text-xl font-bold">
                {data.mode === "aa" ? "AA 分单小票" : "结账小票"}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                桌台 {data.tableNumber} · 订单号 {data.orderId}
              </p>
            </div>
            <Separator />
            <div className="space-y-1 text-xs pos-receipt-section">
              <div className="flex justify-between">
                <span>时间</span>
                <span>{data.paidAt}</span>
              </div>
              <div className="flex justify-between">
                <span>支付方式</span>
                <span>{data.paymentMethod === "card" ? "刷卡" : "现金"}</span>
              </div>
            </div>
            <Separator />
            <div className="max-h-60 overflow-y-auto print:max-h-none print:overflow-visible pos-receipt-section">
              {data.items.map((item) => (
                <div
                  key={item.name}
                  className="flex justify-between text-xs py-1 print:break-inside-avoid"
                  style={{ breakInside: "avoid" }}
                >
                  <div className="flex-1 pr-2">
                    <div className="flex justify-between">
                      <span className="truncate max-w-[8rem] print:whitespace-normal print:max-w-none">
                        {item.name}
                      </span>
                      <span>x{item.quantity}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      单价 €{item.unitPrice.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right text-xs font-medium">
                    €{item.totalPrice.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
            <Separator />
            <div className="space-y-1 text-sm pos-receipt-section">
              <div className="flex justify-between">
                <span>小计</span>
                <span>€{data.subtotal.toFixed(2)}</span>
              </div>
              {data.discountPercent > 0 && (
                <div className="flex justify-between text-xs">
                  <span>折扣 ({data.discountPercent}%)</span>
                  <span>-€{data.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold">
                <span>应付金额</span>
                <span>€{data.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>实收</span>
                <span>€{data.receivedAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>找零</span>
                <span>€{data.changeAmount.toFixed(2)}</span>
              </div>
            </div>
            <div className="pt-2 flex justify-center gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={onClose}>
                返回 POS
              </Button>
              <Button size="sm" onClick={onPrint}>
                重新打印
              </Button>
            </div>
          </div>
        </Card>
      </div>
      <style jsx global>{`
        @page {
          size: 80mm auto;
          margin: 6mm;
        }
        @media print {
          .pos-receipt-card {
            width: 80mm !important;
            max-width: none !important;
          }
          .pos-receipt-section {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </>
  )
}
