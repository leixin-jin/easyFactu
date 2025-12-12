import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
}))

import { GET, POST } from "../restaurant-tables/route"
import { getDb } from "@/lib/db"

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
}

describe("/api/restaurant-tables", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getDb).mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>)
  })

  describe("GET", () => {
    it("should return tables with outstanding amounts", async () => {
      const mockRows = [
        { id: "1", number: "A-01", capacity: 4, status: "idle", area: null, orderTotalAmount: null, orderPaidAmount: null },
        { id: "2", number: "A-02", capacity: 4, status: "occupied", area: null, orderTotalAmount: "100.00", orderPaidAmount: "50.00" },
      ]

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockResolvedValue(mockRows),
        }),
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
      expect(data[0].amount).toBeNull()
      expect(data[1].amount).toBe(50)
    })

    it("should handle database errors", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockRejectedValue(new Error("DB error")),
        }),
      })

      const response = await GET()

      expect(response.status).toBe(500)
    })
  })

  describe("POST", () => {
    it("should validate required fields", async () => {
      const request = new NextRequest("http://localhost/api/restaurant-tables", {
        method: "POST",
        body: JSON.stringify({ number: "A-01" }),
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it("should create table with valid data", async () => {
      const newTable = {
        id: "new-id",
        number: "B-01",
        area: null,
        capacity: 4,
        status: "idle",
      }

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([newTable]),
        }),
      })

      const request = new NextRequest("http://localhost/api/restaurant-tables", {
        method: "POST",
        body: JSON.stringify({
          number: "B-01",
          capacity: 4,
        }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.number).toBe("B-01")
      expect(data.status).toBe("idle")
    })

    it("should reject duplicate table number", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: "existing-id" }]),
          }),
        }),
      })

      const request = new NextRequest("http://localhost/api/restaurant-tables", {
        method: "POST",
        body: JSON.stringify({
          number: "A-01",
          capacity: 4,
        }),
      })
      const response = await POST(request)

      expect(response.status).toBe(409)
      const data = await response.json()
      expect(data.code).toBe("TABLE_NUMBER_EXISTS")
    })

    it("should validate capacity range", async () => {
      const request = new NextRequest("http://localhost/api/restaurant-tables", {
        method: "POST",
        body: JSON.stringify({
          number: "A-01",
          capacity: 0,
        }),
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it("should accept area field", async () => {
      const newTable = {
        id: "new-id",
        number: "C-01",
        area: "Outdoor",
        capacity: 6,
        status: "idle",
      }

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([newTable]),
        }),
      })

      const request = new NextRequest("http://localhost/api/restaurant-tables", {
        method: "POST",
        body: JSON.stringify({
          number: "C-01",
          capacity: 6,
          area: "Outdoor",
        }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.area).toBe("Outdoor")
    })
  })
})
