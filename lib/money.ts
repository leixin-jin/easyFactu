export function parseMoney(value: unknown): number {
  if (value == null) return 0
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0
  }
  if (typeof value === "string") {
    const normalized = value.replace(",", ".")
    const n = Number.parseFloat(normalized)
    return Number.isNaN(n) ? 0 : n
  }
  if (typeof value === "bigint") {
    return Number(value)
  }
  return 0
}

export function formatMoney(value: number, options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }): string {
  const { minimumFractionDigits = 2, maximumFractionDigits = 2 } = options ?? {}
  const safe = Number.isFinite(value) ? value : 0
  return safe.toLocaleString("en-US", {
    minimumFractionDigits,
    maximumFractionDigits,
    useGrouping: false,
  })
}

export function toMoneyString(value: number): string {
  if (!Number.isFinite(value)) return "0.00"
  return value.toFixed(2)
}

export function addMoney(values: unknown[]): number {
  return values.reduce((sum, v) => sum + parseMoney(v), 0)
}

