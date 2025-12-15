export type DailyClosurePaymentGroup = "cash" | "card" | "platform" | "other"

export interface DailyClosureOverviewInput {
  grossRevenue: number
  ordersCount: number
  taxRate: number
  refundAmount: number
  voidAmount: number
}

export interface DailyClosureOverview {
  grossRevenue: number
  netRevenue: number
  ordersCount: number
  averageOrderValueGross: number
  averageOrderValueNet: number
  refundAmount: number
  voidAmount: number
}

export interface IncomeTransactionInput {
  paymentMethod: string
  amount: number
}

export interface DailyClosurePaymentLineInput {
  paymentMethod: string
  paymentGroup: DailyClosurePaymentGroup
  expectedAmount: number
}

export interface DailyClosureAdjustmentInput {
  amount: number
  paymentMethod?: string | null
}

export interface DailyClosurePaymentLineSummary extends DailyClosurePaymentLineInput {
  adjustmentsAmount: number
  actualAmount: number
}

export interface DailyClosurePayments {
  expectedTotal: number
  actualTotal: number
  difference: number
  cashExpectedTotal: number
  cashActualTotal: number
  nonCashExpectedTotal: number
  nonCashActualTotal: number
  lines: DailyClosurePaymentLineSummary[]
}

export interface DailyClosureItemLine {
  menuItemId: string | null
  name: string
  category: string
  quantitySold: number
  revenueAmount: number
  discountImpactAmount: number | null
}

export interface DailyClosureItems {
  categories: string[]
  lines: DailyClosureItemLine[]
}

function roundMoney(value: number) {
  if (!Number.isFinite(value)) return 0
  return Number(value.toFixed(2))
}

function safeMoney(value: number) {
  return Number.isFinite(value) ? value : 0
}

export function inferDailyClosurePaymentGroup(
  paymentMethod: string,
): DailyClosurePaymentGroup {
  const normalized = paymentMethod.trim().toLowerCase()

  if (!normalized) return "other"

  const cashKeywords = ["cash", "现金", "contado"]
  if (cashKeywords.some((keyword) => normalized.includes(keyword))) {
    return "cash"
  }

  const platformKeywords = ["uber", "glovo", "deliveroo", "wolt", "justeat"]
  if (platformKeywords.some((keyword) => normalized.includes(keyword))) {
    return "platform"
  }

  const cardKeywords = [
    "card",
    "credit",
    "debit",
    "visa",
    "master",
    "amex",
    "apple",
    "google",
    "pay",
    "stripe",
    "银行卡",
    "pos",
  ]
  if (cardKeywords.some((keyword) => normalized.includes(keyword))) {
    return "card"
  }

  return "other"
}

export function calculateDailyClosureOverview(
  input: DailyClosureOverviewInput,
): DailyClosureOverview {
  const grossRevenue = safeMoney(input.grossRevenue)
  const refundAmount = safeMoney(input.refundAmount)
  const voidAmount = safeMoney(input.voidAmount)
  const ordersCount = Number.isFinite(input.ordersCount)
    ? Math.max(0, Math.trunc(input.ordersCount))
    : 0

  const taxRate = Number.isFinite(input.taxRate) ? Math.max(0, input.taxRate) : 0
  const netRevenue =
    taxRate > 0 ? grossRevenue / (1 + taxRate) : grossRevenue

  const averageOrderValueGross =
    ordersCount > 0 ? grossRevenue / ordersCount : 0
  const averageOrderValueNet = ordersCount > 0 ? netRevenue / ordersCount : 0

  return {
    grossRevenue: roundMoney(grossRevenue),
    netRevenue: roundMoney(netRevenue),
    ordersCount,
    averageOrderValueGross: roundMoney(averageOrderValueGross),
    averageOrderValueNet: roundMoney(averageOrderValueNet),
    refundAmount: roundMoney(refundAmount),
    voidAmount: roundMoney(voidAmount),
  }
}

export function aggregateIncomeByPaymentMethod(
  transactions: IncomeTransactionInput[],
): DailyClosurePaymentLineInput[] {
  const sums = new Map<string, number>()

  for (const t of transactions) {
    const method = t.paymentMethod?.trim() ?? ""
    if (!method) continue
    const amount = safeMoney(t.amount)
    sums.set(method, (sums.get(method) ?? 0) + amount)
  }

  return Array.from(sums.entries())
    .map(([paymentMethod, expectedAmount]) => ({
      paymentMethod,
      paymentGroup: inferDailyClosurePaymentGroup(paymentMethod),
      expectedAmount: roundMoney(expectedAmount),
    }))
    .sort((a, b) => b.expectedAmount - a.expectedAmount)
}

export function buildDailyClosurePayments(
  lines: DailyClosurePaymentLineInput[],
  adjustments: DailyClosureAdjustmentInput[] = [],
): DailyClosurePayments {
  const adjustmentsByMethod = new Map<string, number>()
  let unassignedAdjustmentsAmount = 0

  for (const adjustment of adjustments) {
    const amount = safeMoney(adjustment.amount)
    const method = adjustment.paymentMethod?.trim()
    if (!method) {
      unassignedAdjustmentsAmount += amount
      continue
    }
    adjustmentsByMethod.set(method, (adjustmentsByMethod.get(method) ?? 0) + amount)
  }

  let expectedTotal = 0
  let cashExpectedTotal = 0
  let nonCashExpectedTotal = 0

  const summaries: DailyClosurePaymentLineSummary[] = lines.map((line) => {
    const expectedAmount = safeMoney(line.expectedAmount)
    const adjustmentsAmount = safeMoney(adjustmentsByMethod.get(line.paymentMethod) ?? 0)
    const actualAmount = expectedAmount + adjustmentsAmount

    expectedTotal += expectedAmount

    if (line.paymentGroup === "cash") {
      cashExpectedTotal += expectedAmount
    } else {
      nonCashExpectedTotal += expectedAmount
    }

    return {
      ...line,
      expectedAmount: roundMoney(expectedAmount),
      adjustmentsAmount: roundMoney(adjustmentsAmount),
      actualAmount: roundMoney(actualAmount),
    }
  })

  const adjustmentsTotal =
    summaries.reduce((sum, line) => sum + safeMoney(line.adjustmentsAmount), 0) +
    unassignedAdjustmentsAmount

  const actualTotal = expectedTotal + adjustmentsTotal

  const cashActualTotal = summaries
    .filter((line) => line.paymentGroup === "cash")
    .reduce((sum, line) => sum + safeMoney(line.actualAmount), 0)

  const nonCashActualTotal = actualTotal - cashActualTotal

  return {
    expectedTotal: roundMoney(expectedTotal),
    actualTotal: roundMoney(actualTotal),
    difference: roundMoney(adjustmentsTotal),
    cashExpectedTotal: roundMoney(cashExpectedTotal),
    cashActualTotal: roundMoney(cashActualTotal),
    nonCashExpectedTotal: roundMoney(nonCashExpectedTotal),
    nonCashActualTotal: roundMoney(nonCashActualTotal),
    lines: summaries.sort((a, b) => b.expectedAmount - a.expectedAmount),
  }
}

export function buildDailyClosureItems(lines: DailyClosureItemLine[]): DailyClosureItems {
  const categories = Array.from(
    new Set(
      lines
        .map((line) => line.category?.trim())
        .filter((category): category is string => Boolean(category)),
    ),
  ).sort((a, b) => a.localeCompare(b))

  return {
    categories,
    lines: lines
      .map((line) => ({
        ...line,
        quantitySold: Math.max(0, Math.trunc(line.quantitySold ?? 0)),
        revenueAmount: roundMoney(safeMoney(line.revenueAmount)),
        discountImpactAmount:
          line.discountImpactAmount == null
            ? null
            : roundMoney(safeMoney(line.discountImpactAmount)),
      }))
      .sort((a, b) => b.revenueAmount - a.revenueAmount),
  }
}

