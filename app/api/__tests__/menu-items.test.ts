import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
}))

import { GET, POST } from "../menu-items/route"
import { getDb } from "@/lib/db"

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
}

describe("/api/menu-items", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getDb).mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>)
  })

  describe("GET", () => {
    it("should return menu items with categories", async () => {
      const mockItems = [
        { id: "1", name: "Test Item", nameEn: null, category: "Main", price: "10.00", description: null, image: null, available: true },
        { id: "2", name: "Test Item 2", nameEn: "Test EN", category: "Main", price: "15.00", description: null, image: null, available: true },
        { id: "3", name: "Drink", nameEn: null, category: "Beverage", price: "5.00", description: null, image: null, available: true },
      ]

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockItems),
        }),
      })

      const request = new NextRequest("http://localhost/api/menu-items")
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty("items")
      expect(data).toHaveProperty("categories")
      expect(data.items).toHaveLength(3)
      expect(data.categories).toContainEqual({ id: "all", name: "全部菜品", count: 3 })
    })

    it("should handle database errors", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error("DB error")),
        }),
      })

      const request = new NextRequest("http://localhost/api/menu-items")
      const response = await GET(request)

      expect(response.status).toBe(500)
    })
  })

  describe("POST", () => {
    it("should validate required fields", async () => {
      const request = new NextRequest("http://localhost/api/menu-items", {
        method: "POST",
        body: JSON.stringify({ name: "Test" }),
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty("error")
    })

    it("should create menu item with valid data", async () => {
      const newItem = {
        id: "new-id",
        name: "New Item",
        nameEn: null,
        category: "Main",
        price: "20.00",
        description: null,
        image: null,
        available: true,
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
          returning: vi.fn().mockResolvedValue([newItem]),
        }),
      })

      const request = new NextRequest("http://localhost/api/menu-items", {
        method: "POST",
        body: JSON.stringify({
          name: "New Item",
          category: "Main",
          price: 20,
        }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.name).toBe("New Item")
    })

    it("should reject duplicate menu item", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: "existing-id" }]),
          }),
        }),
      })

      const request = new NextRequest("http://localhost/api/menu-items", {
        method: "POST",
        body: JSON.stringify({
          name: "Existing Item",
          category: "Main",
          price: 20,
        }),
      })
      const response = await POST(request)

      expect(response.status).toBe(409)
      const data = await response.json()
      expect(data.code).toBe("MENU_ITEM_EXISTS")
    })

    it("should reject invalid JSON body", async () => {
      const request = new NextRequest("http://localhost/api/menu-items", {
        method: "POST",
        body: "not json",
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it("should validate price is positive", async () => {
      const request = new NextRequest("http://localhost/api/menu-items", {
        method: "POST",
        body: JSON.stringify({
          name: "Test",
          category: "Main",
          price: -10,
        }),
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })
})
