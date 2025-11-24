import { parseMoney } from "@/lib/money"

export interface OrderItemRow {
  id: string
  batchNo: number | null
  quantity: number
  paidQuantity?: number | null
  price: unknown
  notes: string | null
  createdAt: unknown
  menuItemId: string
  name: string | null
  nameEn: string | null
}

export interface OrderItemView {
  id: string
  menuItemId: string
  name: string
  nameEn: string
  price: number
  quantity: number
  notes: string | null
  createdAt: string
}

export interface OrderBatchView {
  batchNo: number
  items: OrderItemView[]
}

interface BuildOrderBatchesOptions {
  /**
   * 是否跳过已完全支付的数量（用于仅展示未结清部分）。
   */
  omitFullyPaid?: boolean
}

export function buildOrderBatches(
  rows: OrderItemRow[],
  options: BuildOrderBatchesOptions = {},
): OrderBatchView[] {
  const { omitFullyPaid = false } = options

  const batchesMap = new Map<number, OrderBatchView>()

  for (const row of rows) {
    const batchNo = row.batchNo ?? 1
    const paidQty = row.paidQuantity ?? 0
    const quantity = omitFullyPaid ? row.quantity - paidQty : row.quantity

    if (omitFullyPaid && quantity <= 0) {
      continue
    }

    if (!batchesMap.has(batchNo)) {
      batchesMap.set(batchNo, { batchNo, items: [] })
    }

    const batch = batchesMap.get(batchNo)!
    const price = parseMoney(row.price)

    const createdAtInput = row.createdAt
    const parsedDate =
      createdAtInput instanceof Date
        ? createdAtInput
        : typeof createdAtInput === "string" || typeof createdAtInput === "number"
          ? new Date(createdAtInput)
          : null

    const createdAt =
      parsedDate && !Number.isNaN(parsedDate.getTime())
        ? parsedDate.toISOString()
        : String(createdAtInput)

    batch.items.push({
      id: row.id,
      menuItemId: row.menuItemId,
      name: row.name ?? "",
      nameEn: row.nameEn ?? "",
      quantity,
      price,
      notes: row.notes ?? null,
      createdAt,
    })
  }

  return Array.from(batchesMap.values()).sort((a, b) => a.batchNo - b.batchNo)
}
