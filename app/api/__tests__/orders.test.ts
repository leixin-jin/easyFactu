import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
}))

import { GET, POST } from "../orders/route"
import { getDb } from "@/lib/db"

const mockTx = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
}

const mockDb = {
  select: vi.fn(),
  transaction: vi.fn((fn) => fn(mockTx)),
}

describe("/api/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getDb).mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>)
  })

  describe("GET", () => {
    it("should require tableId parameter", async () => {
      const request = new NextRequest("http://localhost/api/orders")
      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe("Missing tableId")
    })

    it("should return 404 for non-existent table", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      const request = new NextRequest("http://localhost/api/orders?tableId=non-existent")
      const response = await GET(request)

      expect(response.status).toBe(404)
    })

    it("should return empty batches when no open order", async () => {
      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: "table-1" }]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        })

      const request = new NextRequest("http://localhost/api/orders?tableId=table-1")
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.order).toBeNull()
      expect(data.batches).toEqual([])
    })

    it("should return order with batches", async () => {
      const mockOrder = {
        id: "order-1",
        tableId: "table-1",
        status: "open",
        subtotal: "100.00",
        discount: "10.00",
        total: "90.00",
        totalAmount: "100.00",
        paidAmount: "0.00",
        paymentMethod: "cash",
        createdAt: new Date("2024-01-01"),
        closedAt: null,
      }

      const mockOrderItems = [
        {
          id: "item-1",
          batchNo: 1,
          quantity: 2,
          paidQuantity: 0,
          price: "25.00",
          notes: null,
          createdAt: new Date("2024-01-01"),
          menuItemId: "menu-1",
          name: "Test Item",
          nameEn: "Test EN",
        },
      ]

      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: "table-1" }]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockOrder]),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockResolvedValue(mockOrderItems),
              }),
            }),
          }),
        })

      const request = new NextRequest("http://localhost/api/orders?tableId=table-1")
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.order).not.toBeNull()
      expect(data.order.id).toBe("order-1")
      expect(data.batches).toHaveLength(1)
    })
  })

  describe("POST", () => {
    it("should validate required fields", async () => {
      const request = new NextRequest("http://localhost/api/orders", {
        method: "POST",
        body: JSON.stringify({ tableId: "table-1" }),
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it("should validate items array is not empty", async () => {
      const request = new NextRequest("http://localhost/api/orders", {
        method: "POST",
        body: JSON.stringify({
          tableId: "table-1",
          items: [],
        }),
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it("should return 404 for non-existent table", async () => {
      mockTx.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      const request = new NextRequest("http://localhost/api/orders", {
        method: "POST",
        body: JSON.stringify({
          tableId: "123e4567-e89b-12d3-a456-426614174000",
          items: [{ menuItemId: "123e4567-e89b-12d3-a456-426614174001", quantity: 1 }],
        }),
      })
      const response = await POST(request)

      expect(response.status).toBe(404)
    })

    it("should validate menuItemId is UUID", async () => {
      const request = new NextRequest("http://localhost/api/orders", {
        method: "POST",
        body: JSON.stringify({
          tableId: "123e4567-e89b-12d3-a456-426614174000",
          items: [{ menuItemId: "not-a-uuid", quantity: 1 }],
        }),
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it("should validate quantity is positive", async () => {
      const request = new NextRequest("http://localhost/api/orders", {
        method: "POST",
        body: JSON.stringify({
          tableId: "123e4567-e89b-12d3-a456-426614174000",
          items: [{ menuItemId: "123e4567-e89b-12d3-a456-426614174001", quantity: 0 }],
        }),
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it("should accept items with notes field", async () => {
      const request = new NextRequest("http://localhost/api/orders", {
        method: "POST",
        body: JSON.stringify({
          tableId: "123e4567-e89b-12d3-a456-426614174000",
          items: [
            {
              menuItemId: "123e4567-e89b-12d3-a456-426614174001",
              quantity: 1,
              notes: "不要辣"
            }
          ],
        }),
      })

      // 此测试验证 notes 字段不会导致校验失败
      // 完整持久化链路参见：__tests__/integration/orders.test.ts
      mockTx.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      const response = await POST(request)
      // 返回 404 表示校验通过了（table not found）
      expect(response.status).toBe(404)
    })

    it("should accept items with null notes", async () => {
      const request = new NextRequest("http://localhost/api/orders", {
        method: "POST",
        body: JSON.stringify({
          tableId: "123e4567-e89b-12d3-a456-426614174000",
          items: [
            {
              menuItemId: "123e4567-e89b-12d3-a456-426614174001",
              quantity: 2,
              notes: null
            }
          ],
        }),
      })

      mockTx.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      const response = await POST(request)
      // 返回 404 表示校验通过了（table not found）
      expect(response.status).toBe(404)
    })

    it("should reject notes exceeding 500 characters", async () => {
      const longNotes = "a".repeat(501)
      const request = new NextRequest("http://localhost/api/orders", {
        method: "POST",
        body: JSON.stringify({
          tableId: "123e4567-e89b-12d3-a456-426614174000",
          items: [
            {
              menuItemId: "123e4567-e89b-12d3-a456-426614174001",
              quantity: 1,
              notes: longNotes
            }
          ],
        }),
      })

      const response = await POST(request)
      // 应该返回 400 校验错误
      expect(response.status).toBe(400)
    })

    it("should accept notes at exactly 500 characters", async () => {
      const maxNotes = "备".repeat(500)
      const request = new NextRequest("http://localhost/api/orders", {
        method: "POST",
        body: JSON.stringify({
          tableId: "123e4567-e89b-12d3-a456-426614174000",
          items: [
            {
              menuItemId: "123e4567-e89b-12d3-a456-426614174001",
              quantity: 1,
              notes: maxNotes
            }
          ],
        }),
      })

      mockTx.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      const response = await POST(request)
      // 返回 404 表示校验通过了（table not found）
      expect(response.status).toBe(404)
    })
  })
})
