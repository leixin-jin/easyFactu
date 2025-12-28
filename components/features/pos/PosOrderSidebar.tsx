"use client"

import { PosOrderPanel, type PosOrderPanelProps } from "./PosOrderPanel"

/**
 * @deprecated 请使用 PosOrderPanel
 * 此组件仅用于兼容旧的 PosOrderSidebar API
 */
export type PosOrderSidebarProps = Omit<PosOrderPanelProps, "discountPercent" | "tableNumberParam"> & {
  discount?: number
  discountPercent?: number
  tableNumberParam?: string
}

export function PosOrderSidebar({
  discount,
  discountPercent,
  tableNumberParam = "",
  ...rest
}: PosOrderSidebarProps) {
  return (
    <PosOrderPanel
      {...rest}
      tableNumberParam={tableNumberParam}
      discountPercent={discountPercent ?? discount ?? 0}
    />
  )
}
