import { describe, it, expect } from "vitest"
import { calculateCheckoutTotal, calculateAASplit } from "../calculate"

describe("calculateCheckoutTotal", () => {
  it("should calculate subtotal correctly", () => {
    const items = [
      { price: 10, quantity: 2 },
      { price: 15, quantity: 1 },
    ]
    const result = calculateCheckoutTotal(items, 0)

    expect(result.subtotal).toBe(35)
    expect(result.discount).toBe(0)
    expect(result.total).toBe(35)
  })

  it("should apply discount correctly", () => {
    const items = [{ price: 100, quantity: 1 }]
    const result = calculateCheckoutTotal(items, 10)

    expect(result.subtotal).toBe(100)
    expect(result.discount).toBe(10)
    expect(result.total).toBe(90)
  })

  it("should handle empty items", () => {
    const result = calculateCheckoutTotal([], 0)

    expect(result.subtotal).toBe(0)
    expect(result.discount).toBe(0)
    expect(result.total).toBe(0)
  })

  it("should handle 100% discount", () => {
    const items = [{ price: 50, quantity: 2 }]
    const result = calculateCheckoutTotal(items, 100)

    expect(result.subtotal).toBe(100)
    expect(result.discount).toBe(100)
    expect(result.total).toBe(0)
  })

  it("should clamp discount to 0-100 range", () => {
    const items = [{ price: 100, quantity: 1 }]

    const resultNegative = calculateCheckoutTotal(items, -10)
    expect(resultNegative.discount).toBe(0)
    expect(resultNegative.total).toBe(100)

    const resultOver = calculateCheckoutTotal(items, 150)
    expect(resultOver.discount).toBe(100)
    expect(resultOver.total).toBe(0)
  })

  it("should handle multiple items with quantities", () => {
    const items = [
      { price: 28, quantity: 2 },
      { price: 18, quantity: 3 },
      { price: 5, quantity: 4 },
    ]
    const result = calculateCheckoutTotal(items, 0)

    expect(result.subtotal).toBe(28 * 2 + 18 * 3 + 5 * 4)
    expect(result.total).toBe(130)
  })

  it("should round discount calculations correctly", () => {
    const items = [{ price: 33.33, quantity: 3 }]
    const result = calculateCheckoutTotal(items, 15)

    expect(result.subtotal).toBeCloseTo(99.99)
    expect(result.discount).toBeCloseTo(14.9985)
    expect(result.total).toBeCloseTo(84.9915)
  })

  it("should handle zero quantity", () => {
    const items = [{ price: 100, quantity: 0 }]
    const result = calculateCheckoutTotal(items, 0)

    expect(result.subtotal).toBe(0)
    expect(result.total).toBe(0)
  })
})

describe("calculateAASplit", () => {
  it("should split total evenly among people", () => {
    const items = [
      { id: "1", name: "Item 1", price: 30, quantity: 1 },
      { id: "2", name: "Item 2", price: 20, quantity: 1 },
    ]
    const result = calculateAASplit(items, 2)

    expect(result.totalPeople).toBe(2)
    expect(result.perPersonAmount).toBe(25)
    expect(result.items).toEqual(items)
  })

  it("should handle discount in AA split", () => {
    const items = [{ id: "1", name: "Item 1", price: 100, quantity: 1 }]
    const result = calculateAASplit(items, 4, 20)

    expect(result.perPersonAmount).toBe(20)
  })

  it("should return 0 when totalPeople is 0", () => {
    const items = [{ id: "1", name: "Item 1", price: 100, quantity: 1 }]
    const result = calculateAASplit(items, 0)

    expect(result.perPersonAmount).toBe(0)
  })

  it("should handle empty items", () => {
    const result = calculateAASplit([], 3)

    expect(result.perPersonAmount).toBe(0)
  })

  it("should round per person amount to 2 decimals", () => {
    const items = [{ id: "1", name: "Item 1", price: 100, quantity: 1 }]
    const result = calculateAASplit(items, 3)

    expect(result.perPersonAmount).toBe(33.33)
  })

  it("should handle single person", () => {
    const items = [{ id: "1", name: "Item 1", price: 50, quantity: 2 }]
    const result = calculateAASplit(items, 1)

    expect(result.perPersonAmount).toBe(100)
  })
})
