import { describe, it, expect } from "vitest"

import {
  aggregateIncomeByPaymentMethod,
  buildDailyClosureItems,
  buildDailyClosurePayments,
  calculateDailyClosureOverview,
  inferDailyClosurePaymentGroup,
} from "../daily-closure/calculate"

describe("inferDailyClosurePaymentGroup", () => {
  it("detects cash", () => {
    expect(inferDailyClosurePaymentGroup("cash")).toBe("cash")
    expect(inferDailyClosurePaymentGroup("现金")).toBe("cash")
  })

  it("detects card", () => {
    expect(inferDailyClosurePaymentGroup("Visa")).toBe("card")
    expect(inferDailyClosurePaymentGroup("Apple Pay")).toBe("card")
  })

  it("detects platform", () => {
    expect(inferDailyClosurePaymentGroup("UberEats")).toBe("platform")
  })

  it("falls back to other", () => {
    expect(inferDailyClosurePaymentGroup("bank transfer")).toBe("other")
  })
})

describe("calculateDailyClosureOverview", () => {
  it("computes net revenue and averages", () => {
    const overview = calculateDailyClosureOverview({
      grossRevenue: 110,
      ordersCount: 2,
      taxRate: 0.1,
      refundAmount: 0,
      voidAmount: 0,
    })

    expect(overview.grossRevenue).toBe(110)
    expect(overview.netRevenue).toBe(100)
    expect(overview.ordersCount).toBe(2)
    expect(overview.averageOrderValueGross).toBe(55)
    expect(overview.averageOrderValueNet).toBe(50)
  })

  it("handles zero orders", () => {
    const overview = calculateDailyClosureOverview({
      grossRevenue: 100,
      ordersCount: 0,
      taxRate: 0.1,
      refundAmount: 0,
      voidAmount: 0,
    })

    expect(overview.averageOrderValueGross).toBe(0)
    expect(overview.averageOrderValueNet).toBe(0)
  })
})

describe("aggregateIncomeByPaymentMethod", () => {
  it("aggregates by payment method and sorts", () => {
    const lines = aggregateIncomeByPaymentMethod([
      { paymentMethod: "cash", amount: 10 },
      { paymentMethod: "cash", amount: 2.5 },
      { paymentMethod: "visa", amount: 5 },
    ])

    expect(lines).toEqual([
      { paymentMethod: "cash", paymentGroup: "cash", expectedAmount: 12.5 },
      { paymentMethod: "visa", paymentGroup: "card", expectedAmount: 5 },
    ])
  })
})

describe("buildDailyClosurePayments", () => {
  it("applies adjustments per payment method and total", () => {
    const payments = buildDailyClosurePayments(
      [
        { paymentMethod: "cash", paymentGroup: "cash", expectedAmount: 100 },
        { paymentMethod: "visa", paymentGroup: "card", expectedAmount: 50 },
      ],
      [
        { paymentMethod: "cash", amount: -1.5 },
        { paymentMethod: null, amount: -0.5 },
      ],
    )

    expect(payments.expectedTotal).toBe(150)
    expect(payments.difference).toBe(-2)
    expect(payments.actualTotal).toBe(148)
    expect(payments.cashActualTotal).toBe(98.5)
    expect(payments.nonCashActualTotal).toBe(49.5)
  })
})

describe("buildDailyClosureItems", () => {
  it("returns categories and sorts by revenue", () => {
    const items = buildDailyClosureItems([
      {
        menuItemId: "m1",
        name: "A",
        category: "主食",
        quantitySold: 2,
        revenueAmount: 10,
        discountImpactAmount: null,
      },
      {
        menuItemId: "m2",
        name: "B",
        category: "饮料",
        quantitySold: 1,
        revenueAmount: 20,
        discountImpactAmount: 0,
      },
    ])

    expect(items.categories).toEqual(["主食", "饮料"])
    expect(items.lines[0].name).toBe("B")
    expect(items.lines[1].name).toBe("A")
  })
})

