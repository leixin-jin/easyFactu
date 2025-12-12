import { describe, it, expect } from "vitest"
import { buildOrderBatches, type OrderItemRow } from "../order-utils"

describe("buildOrderBatches", () => {
  const createRow = (overrides: Partial<OrderItemRow> = {}): OrderItemRow => ({
    id: "item-1",
    batchNo: 1,
    quantity: 1,
    paidQuantity: 0,
    price: "10.00",
    notes: null,
    createdAt: "2024-01-01T00:00:00.000Z",
    menuItemId: "menu-1",
    name: "Test Item",
    nameEn: "Test Item EN",
    ...overrides,
  })

  it("should return empty array for empty input", () => {
    expect(buildOrderBatches([])).toEqual([])
  })

  it("should create single batch from single item", () => {
    const rows = [createRow()]
    const result = buildOrderBatches(rows)

    expect(result).toHaveLength(1)
    expect(result[0].batchNo).toBe(1)
    expect(result[0].items).toHaveLength(1)
    expect(result[0].items[0].name).toBe("Test Item")
    expect(result[0].items[0].price).toBe(10)
  })

  it("should group items by batch number", () => {
    const rows = [
      createRow({ id: "item-1", batchNo: 1 }),
      createRow({ id: "item-2", batchNo: 1 }),
      createRow({ id: "item-3", batchNo: 2 }),
    ]
    const result = buildOrderBatches(rows)

    expect(result).toHaveLength(2)
    expect(result[0].batchNo).toBe(1)
    expect(result[0].items).toHaveLength(2)
    expect(result[1].batchNo).toBe(2)
    expect(result[1].items).toHaveLength(1)
  })

  it("should sort batches by batch number", () => {
    const rows = [
      createRow({ id: "item-1", batchNo: 3 }),
      createRow({ id: "item-2", batchNo: 1 }),
      createRow({ id: "item-3", batchNo: 2 }),
    ]
    const result = buildOrderBatches(rows)

    expect(result.map((b) => b.batchNo)).toEqual([1, 2, 3])
  })

  it("should default null batchNo to 1", () => {
    const rows = [createRow({ batchNo: null })]
    const result = buildOrderBatches(rows)

    expect(result).toHaveLength(1)
    expect(result[0].batchNo).toBe(1)
  })

  it("should parse price correctly", () => {
    const rows = [createRow({ price: "25.50" })]
    const result = buildOrderBatches(rows)

    expect(result[0].items[0].price).toBe(25.5)
  })

  it("should handle null name/nameEn", () => {
    const rows = [createRow({ name: null, nameEn: null })]
    const result = buildOrderBatches(rows)

    expect(result[0].items[0].name).toBe("")
    expect(result[0].items[0].nameEn).toBe("")
  })

  it("should format createdAt as ISO string", () => {
    const date = new Date("2024-01-15T12:30:00.000Z")
    const rows = [createRow({ createdAt: date })]
    const result = buildOrderBatches(rows)

    expect(result[0].items[0].createdAt).toBe("2024-01-15T12:30:00.000Z")
  })

  describe("omitFullyPaid option", () => {
    it("should include all items when omitFullyPaid is false", () => {
      const rows = [
        createRow({ id: "item-1", quantity: 2, paidQuantity: 2 }),
        createRow({ id: "item-2", quantity: 2, paidQuantity: 0 }),
      ]
      const result = buildOrderBatches(rows, { omitFullyPaid: false })

      expect(result[0].items).toHaveLength(2)
      expect(result[0].items[0].quantity).toBe(2)
      expect(result[0].items[1].quantity).toBe(2)
    })

    it("should exclude fully paid items when omitFullyPaid is true", () => {
      const rows = [
        createRow({ id: "item-1", quantity: 2, paidQuantity: 2 }),
        createRow({ id: "item-2", quantity: 2, paidQuantity: 0 }),
      ]
      const result = buildOrderBatches(rows, { omitFullyPaid: true })

      expect(result[0].items).toHaveLength(1)
      expect(result[0].items[0].id).toBe("item-2")
    })

    it("should adjust quantity for partially paid items", () => {
      const rows = [createRow({ quantity: 5, paidQuantity: 3 })]
      const result = buildOrderBatches(rows, { omitFullyPaid: true })

      expect(result[0].items[0].quantity).toBe(2)
    })

    it("should exclude batch if all items are fully paid", () => {
      const rows = [
        createRow({ id: "item-1", batchNo: 1, quantity: 2, paidQuantity: 2 }),
        createRow({ id: "item-2", batchNo: 2, quantity: 2, paidQuantity: 0 }),
      ]
      const result = buildOrderBatches(rows, { omitFullyPaid: true })

      expect(result).toHaveLength(1)
      expect(result[0].batchNo).toBe(2)
    })

    it("should handle null paidQuantity as 0", () => {
      const rows = [createRow({ quantity: 2, paidQuantity: null })]
      const result = buildOrderBatches(rows, { omitFullyPaid: true })

      expect(result[0].items[0].quantity).toBe(2)
    })
  })

  it("should handle various createdAt formats", () => {
    const rows = [
      createRow({ id: "item-1", createdAt: "2024-01-01" }),
      createRow({ id: "item-2", createdAt: 1704067200000 }),
      createRow({ id: "item-3", createdAt: null as unknown as string }),
    ]
    const result = buildOrderBatches(rows)

    expect(result[0].items[0].createdAt).toContain("2024")
    expect(result[0].items[1].createdAt).toContain("2024")
    expect(result[0].items[2].createdAt).toBe("null")
  })
})
