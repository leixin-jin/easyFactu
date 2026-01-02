import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
}))

import { GET } from "../transactions/[id]/route"
import { POST as REVERSE } from "../transactions/[id]/reverse/route"
import { getDb } from "@/lib/db"

const mockTx = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

const mockDb = {
  select: vi.fn(),
  transaction: vi.fn((fn) => fn(mockTx)),
}
const TRANSACTION_ID = "11111111-1111-1111-1111-111111111111"
const MISSING_TRANSACTION_ID = "22222222-2222-2222-2222-222222222222"
const AA_TRANSACTION_ID = "33333333-3333-3333-3333-333333333333"

describe("/api/transactions/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getDb).mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>)
  })

  describe("GET /api/transactions/[id]", () => {
    it("should return 404 for non-existent transaction", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      const request = new NextRequest(`http://localhost/api/transactions/${MISSING_TRANSACTION_ID}`)
      const params = { params: Promise.resolve({ id: MISSING_TRANSACTION_ID }) }
      const response = await GET(request, params)

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.code).toBe("TRANSACTION_NOT_FOUND")
    })

    it("should return transaction detail with items", async () => {
      const mockTransaction = {
        id: TRANSACTION_ID,
        type: "income",
        category: "POS checkout",
        amount: "100.00",
        description: "Test checkout",
        date: "2024-01-01",
        paymentMethod: "cash",
        orderId: "order-1",
        createdAt: new Date("2024-01-01"),
      }

      const mockItems = [
        {
          id: "item-1",
          orderItemId: "order-item-1",
          quantity: 2,
          menuItemId: "menu-1",
          nameSnapshot: "Test Item",
          unitPrice: "25.00",
          createdAt: new Date("2024-01-01"),
        },
      ]

      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockTransaction]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockItems),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ tableId: "table-1" }]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ number: "A1" }]),
            }),
          }),
        })

      const request = new NextRequest(`http://localhost/api/transactions/${TRANSACTION_ID}`)
      const params = { params: Promise.resolve({ id: TRANSACTION_ID }) }
      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.transaction.id).toBe(TRANSACTION_ID)
      expect(data.items).toHaveLength(1)
      expect(data.hasItems).toBe(true)
    })

    it("should return hasItems=false when no items", async () => {
      const mockTransaction = {
        id: TRANSACTION_ID,
        type: "income",
        category: "POS checkout",
        amount: "100.00",
        description: null,
        date: "2024-01-01",
        paymentMethod: "cash",
        orderId: null,
        createdAt: new Date("2024-01-01"),
      }

      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockTransaction]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        })

      const request = new NextRequest(`http://localhost/api/transactions/${TRANSACTION_ID}`)
      const params = { params: Promise.resolve({ id: TRANSACTION_ID }) }
      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.hasItems).toBe(false)
    })
  })

  describe("POST /api/transactions/[id]/reverse", () => {
    it("should return 404 for non-existent transaction", async () => {
      mockTx.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      const request = new NextRequest(`http://localhost/api/transactions/${MISSING_TRANSACTION_ID}/reverse`, {
        method: "POST",
      })
      const params = { params: Promise.resolve({ id: MISSING_TRANSACTION_ID }) }
      const response = await REVERSE(request, params)

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.code).toBe("TRANSACTION_NOT_FOUND")
    })

    it("should reject reversal if no transaction items", async () => {
      const mockTransaction = {
        id: TRANSACTION_ID,
        type: "income",
        amount: "100.00",
        orderId: "order-1",
        paymentMethod: "cash",
      }

      mockTx.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockTransaction]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        })

      const request = new NextRequest(`http://localhost/api/transactions/${TRANSACTION_ID}/reverse`, {
        method: "POST",
      })
      const params = { params: Promise.resolve({ id: TRANSACTION_ID }) }
      const response = await REVERSE(request, params)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.code).toBe("NO_TRANSACTION_ITEMS")
    })

    it("should return 409 when table has different open order (regardless of table status)", async () => {
      const mockTransaction = {
        id: TRANSACTION_ID,
        type: "income",
        amount: "100.00",
        orderId: "order-1",
        paymentMethod: "cash",
      }

      const mockItems = [
        { id: "item-1", orderItemId: "oi-1", quantity: 2, unitPrice: "25.00" },
      ]

      const mockOrder = {
        id: "order-1",
        tableId: "table-1",
        status: "paid",
      }

      const mockTable = {
        id: "table-1",
        number: "A1",
      }

      mockTx.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockTransaction]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockItems),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockOrder]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockTable]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: "different-order" }]),
            }),
          }),
        })

      const request = new NextRequest(`http://localhost/api/transactions/${TRANSACTION_ID}/reverse`, {
        method: "POST",
      })
      const params = { params: Promise.resolve({ id: TRANSACTION_ID }) }
      const response = await REVERSE(request, params)

      expect(response.status).toBe(409)
      const data = await response.json()
      expect(data.code).toBe("TABLE_HAS_OPEN_ORDER")
    })

    it("should successfully reverse transaction and reopen order", async () => {
      const mockTransaction = {
        id: TRANSACTION_ID,
        type: "income",
        amount: "50.00",
        orderId: "order-1",
        paymentMethod: "cash",
      }

      const mockTransactionItems = [
        { id: "ti-1", orderItemId: "oi-1", quantity: 2, unitPrice: "25.00" },
      ]

      const mockOrder = {
        id: "order-1",
        tableId: "table-1",
        status: "paid",
      }

      const mockTable = {
        id: "table-1",
        number: "A1",
      }

      const mockOrderItem = {
        id: "oi-1",
        paidQuantity: 2,
      }

      const mockRemainingTransactions = [{ totalAmount: "0" }]

      const mockOrderItems = [
        { price: "25.00", quantity: 2, paidQuantity: 0 },
      ]

      mockTx.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockTransaction]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockTransactionItems),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockOrder]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockTable]),
            }),
          }),
        })
        // 检查是否有其他 open 订单（返回空表示无冲突）
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockOrderItem]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockRemainingTransactions),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockOrderItems),
          }),
        })

      mockTx.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      })

      mockTx.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      })

      const request = new NextRequest(`http://localhost/api/transactions/${TRANSACTION_ID}/reverse`, {
        method: "POST",
      })
      const params = { params: Promise.resolve({ id: TRANSACTION_ID }) }
      const response = await REVERSE(request, params)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.orderId).toBe("order-1")
      expect(data.orderStatus).toBe("open")
    })

    it("should reject non-income transactions", async () => {
      const mockTransaction = {
        id: TRANSACTION_ID,
        type: "expense",
        amount: "100.00",
        orderId: "order-1",
        paymentMethod: "cash",
      }

      mockTx.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockTransaction]),
          }),
        }),
      })

      const request = new NextRequest(`http://localhost/api/transactions/${TRANSACTION_ID}/reverse`, {
        method: "POST",
      })
      const params = { params: Promise.resolve({ id: TRANSACTION_ID }) }
      const response = await REVERSE(request, params)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.code).toBe("INVALID_TRANSACTION_TYPE")
    })

    it("should rollback paid_quantity for AA partial checkout items", async () => {
      // AA 结账场景：只有部分菜品被结账
      const mockTransaction = {
        id: AA_TRANSACTION_ID,
        type: "income",
        amount: "25.00",
        orderId: "order-1",
        paymentMethod: "cash",
      }

      // AA 结账只结了 1 份（原 paidQuantity 从 0 变成 1）
      const mockTransactionItems = [
        { id: "ti-1", orderItemId: "oi-1", quantity: 1, unitPrice: "25.00" },
      ]

      const mockOrder = {
        id: "order-1",
        tableId: "table-1",
        status: "open", // AA 后订单仍 open
      }

      const mockTable = {
        id: "table-1",
        number: "A1",
      }

      const mockOrderItem = {
        id: "oi-1",
        paidQuantity: 1, // 当前已付 1 份
      }

      const mockRemainingTransactions = [{ totalAmount: "0" }]

      const mockOrderItems = [
        { price: "25.00", quantity: 2, paidQuantity: 0 }, // 反结算后 paidQuantity 变回 0
      ]

      mockTx.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockTransaction]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockTransactionItems),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockOrder]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockTable]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockOrderItem]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockRemainingTransactions),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockOrderItems),
          }),
        })

      // 捕获 update 调用参数
      const updateSetCalls: unknown[] = []
      mockTx.update.mockImplementation(() => ({
        set: vi.fn().mockImplementation((setArg) => {
          updateSetCalls.push(setArg)
          return {
            where: vi.fn().mockResolvedValue(undefined),
          }
        }),
      }))

      mockTx.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      })

      const request = new NextRequest(`http://localhost/api/transactions/${AA_TRANSACTION_ID}/reverse`, {
        method: "POST",
      })
      const params = { params: Promise.resolve({ id: AA_TRANSACTION_ID }) }
      const response = await REVERSE(request, params)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.orderStatus).toBe("open")
      expect(data.newPaidAmount).toBe(0)

      // 验证 delete 被调用（交易被删除）
      expect(mockTx.delete).toHaveBeenCalled()

      // 验证 paidQuantity 回退：原值 1，减去交易明细数量 1，应为 0
      const paidQtyUpdate = updateSetCalls.find(
        (call) => typeof call === "object" && call !== null && "paidQuantity" in call
      ) as { paidQuantity: number } | undefined
      expect(paidQtyUpdate).toBeDefined()
      expect(paidQtyUpdate?.paidQuantity).toBe(0) // 1 - 1 = 0

      // 验证订单金额重算：discount 应为 "0"
      const orderUpdate = updateSetCalls.find(
        (call) => typeof call === "object" && call !== null && "discount" in call
      ) as { discount: string; paidAmount: string } | undefined
      expect(orderUpdate).toBeDefined()
      expect(orderUpdate?.discount).toBe("0")
      expect(orderUpdate?.paidAmount).toBe("0.00")
    })

    it("should reject reversal when transaction has no orderId", async () => {
      const mockTransaction = {
        id: TRANSACTION_ID,
        type: "income",
        amount: "100.00",
        orderId: null,
        paymentMethod: "cash",
      }

      const mockItems = [
        { id: "item-1", orderItemId: "oi-1", quantity: 2, unitPrice: "25.00" },
      ]

      mockTx.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockTransaction]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockItems),
          }),
        })

      const request = new NextRequest(`http://localhost/api/transactions/${TRANSACTION_ID}/reverse`, {
        method: "POST",
      })
      const params = { params: Promise.resolve({ id: TRANSACTION_ID }) }
      const response = await REVERSE(request, params)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.code).toBe("NO_ORDER_ID")
    })
  })
})
