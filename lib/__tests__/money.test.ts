import { describe, it, expect } from "vitest"
import { parseMoney, formatMoney, toMoneyString, addMoney } from "../money"

describe("parseMoney", () => {
  it("should parse numeric string correctly", () => {
    expect(parseMoney("10.50")).toBe(10.5)
    expect(parseMoney("100")).toBe(100)
    expect(parseMoney("0.99")).toBe(0.99)
  })

  it("should handle comma as decimal separator", () => {
    expect(parseMoney("10,50")).toBe(10.5)
  })

  it("should handle null/undefined", () => {
    expect(parseMoney(null)).toBe(0)
    expect(parseMoney(undefined)).toBe(0)
  })

  it("should handle numbers directly", () => {
    expect(parseMoney(10.5)).toBe(10.5)
    expect(parseMoney(100)).toBe(100)
    expect(parseMoney(0)).toBe(0)
  })

  it("should handle Infinity and NaN", () => {
    expect(parseMoney(Infinity)).toBe(0)
    expect(parseMoney(-Infinity)).toBe(0)
    expect(parseMoney(NaN)).toBe(0)
  })

  it("should handle invalid strings", () => {
    expect(parseMoney("abc")).toBe(0)
    expect(parseMoney("")).toBe(0)
  })

  it("should handle bigint", () => {
    expect(parseMoney(BigInt(100))).toBe(100)
  })

  it("should handle negative numbers", () => {
    expect(parseMoney(-10.5)).toBe(-10.5)
    expect(parseMoney("-10.5")).toBe(-10.5)
  })

  it("should return 0 for unsupported types", () => {
    expect(parseMoney({})).toBe(0)
    expect(parseMoney([])).toBe(0)
    expect(parseMoney(true)).toBe(0)
  })
})

describe("formatMoney", () => {
  it("should format with default options", () => {
    expect(formatMoney(10.5)).toBe("10.50")
    expect(formatMoney(100)).toBe("100.00")
    expect(formatMoney(0.99)).toBe("0.99")
  })

  it("should format with custom fraction digits", () => {
    expect(formatMoney(10.5, { minimumFractionDigits: 0, maximumFractionDigits: 1 })).toBe("10.5")
    expect(formatMoney(10.123, { minimumFractionDigits: 1, maximumFractionDigits: 1 })).toBe("10.1")
    expect(formatMoney(10, { minimumFractionDigits: 0, maximumFractionDigits: 0 })).toBe("10")
  })

  it("should handle Infinity and NaN", () => {
    expect(formatMoney(Infinity)).toBe("0.00")
    expect(formatMoney(NaN)).toBe("0.00")
  })

  it("should handle negative values", () => {
    expect(formatMoney(-10.5)).toBe("-10.50")
  })
})

describe("toMoneyString", () => {
  it("should convert to 2 decimal places", () => {
    expect(toMoneyString(10.5)).toBe("10.50")
    expect(toMoneyString(100)).toBe("100.00")
    expect(toMoneyString(10.999)).toBe("11.00")
  })

  it("should handle Infinity and NaN", () => {
    expect(toMoneyString(Infinity)).toBe("0.00")
    expect(toMoneyString(NaN)).toBe("0.00")
    expect(toMoneyString(-Infinity)).toBe("0.00")
  })

  it("should handle zero", () => {
    expect(toMoneyString(0)).toBe("0.00")
  })

  it("should handle negative values", () => {
    expect(toMoneyString(-10.5)).toBe("-10.50")
  })
})

describe("addMoney", () => {
  it("should sum array of numbers", () => {
    expect(addMoney([10, 20, 30])).toBe(60)
  })

  it("should handle mixed types", () => {
    expect(addMoney(["10.50", 20, "30.25"])).toBe(60.75)
  })

  it("should handle null/undefined in array", () => {
    expect(addMoney([10, null, undefined, 20])).toBe(30)
  })

  it("should return 0 for empty array", () => {
    expect(addMoney([])).toBe(0)
  })

  it("should handle invalid values", () => {
    expect(addMoney(["abc", 10, "def"])).toBe(10)
  })
})
