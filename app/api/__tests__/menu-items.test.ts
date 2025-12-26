import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
}))

import { GET, POST } from "../menu-items/route"
import { DELETE, PUT } from "../menu-items/[id]/route"
import { GET as GET_DELETED } from "../menu-items/deleted/route"
import { POST as RESTORE } from "../menu-items/[id]/restore/route"
import { getDb } from "@/lib/db"

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
}

// Valid UUID for testing
const VALID_UUID = "12345678-1234-1234-1234-123456789012"
const OTHER_UUID = "87654321-4321-4321-4321-210987654321"

// Helper to create mock context with params
const mockContext = { params: Promise.resolve({}) }

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
      const response = await GET(request, mockContext)
      const json = await response.json()
      const data = json.data ?? json

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
      const response = await GET(request, mockContext)

      expect(response.status).toBe(500)
    })
  })

  describe("POST", () => {
    it("should validate required fields", async () => {
      const request = new NextRequest("http://localhost/api/menu-items", {
        method: "POST",
        body: JSON.stringify({ name: "Test" }),
      })
      const response = await POST(request, mockContext)

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json).toHaveProperty("error")
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
      const response = await POST(request, mockContext)
      const json = await response.json()
      const data = json.data ?? json

      expect(response.status).toBe(200)
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
      const response = await POST(request, mockContext)

      expect(response.status).toBe(409)
      const data = await response.json()
      expect(data.code).toBe("DUPLICATE_ENTRY")
    })

    it("should reject invalid JSON body", async () => {
      const request = new NextRequest("http://localhost/api/menu-items", {
        method: "POST",
        body: "not json",
      })
      const response = await POST(request, mockContext)

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
      const response = await POST(request, mockContext)

      expect(response.status).toBe(400)
    })
  })

  describe("PUT /api/menu-items/[id]", () => {
    it("should return 400 for invalid UUID", async () => {
      const request = new NextRequest("http://localhost/api/menu-items/invalid-id", {
        method: "PUT",
        body: JSON.stringify({
          name: "Test",
        }),
      })
      const response = await PUT(request, { params: Promise.resolve({ id: "invalid-id" }) })

      expect(response.status).toBe(400)
    })

    it("should return 400 for invalid JSON body", async () => {
      const request = new NextRequest(`http://localhost/api/menu-items/${VALID_UUID}`, {
        method: "PUT",
        body: "not json",
      })
      const response = await PUT(request, { params: Promise.resolve({ id: VALID_UUID }) })

      expect(response.status).toBe(400)
    })

    it("should return 400 for empty update body", async () => {
      const request = new NextRequest(`http://localhost/api/menu-items/${VALID_UUID}`, {
        method: "PUT",
        body: JSON.stringify({}), // no fields provided
      })
      const response = await PUT(request, { params: Promise.resolve({ id: VALID_UUID }) })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe("Invalid request body")
    })

    it("should return 404 for non-existent item", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // item not found
          }),
        }),
      })

      const request = new NextRequest(`http://localhost/api/menu-items/${VALID_UUID}`, {
        method: "PUT",
        body: JSON.stringify({ name: "Updated Name" }),
      })
      const response = await PUT(request, { params: Promise.resolve({ id: VALID_UUID }) })

      expect(response.status).toBe(404)
    })

    it("should return 404 for unavailable (soft-deleted) item", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: VALID_UUID, available: false }]),
          }),
        }),
      })

      const request = new NextRequest(`http://localhost/api/menu-items/${VALID_UUID}`, {
        method: "PUT",
        body: JSON.stringify({ name: "Updated Name" }),
      })
      const response = await PUT(request, { params: Promise.resolve({ id: VALID_UUID }) })

      expect(response.status).toBe(404)
    })

    it("should successfully update with partial data (only name)", async () => {
      const existingItem = {
        id: VALID_UUID,
        name: "Old Name",
        nameEn: "Old EN",
        category: "Main",
        price: "10.00",
        description: "Old desc",
        image: null,
        available: true,
      }

      const updatedItem = { ...existingItem, name: "New Name" }

      // First call: check if item exists
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existingItem]),
          }),
        }),
      })

      // Second call: check for duplicates
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // no duplicate
          }),
        }),
      })

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedItem]),
          }),
        }),
      })

      const request = new NextRequest(`http://localhost/api/menu-items/${VALID_UUID}`, {
        method: "PUT",
        body: JSON.stringify({ name: "New Name" }),
      })
      const response = await PUT(request, { params: Promise.resolve({ id: VALID_UUID }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.name).toBe("New Name")
    })

    it("should return 409 for duplicate name in same category", async () => {
      const existingItem = {
        id: VALID_UUID,
        name: "Old Name",
        nameEn: null,
        category: "Main",
        price: "10.00",
        description: null,
        image: null,
        available: true,
      }

      // First call: check if item exists
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existingItem]),
          }),
        }),
      })

      // Second call: check for duplicates - found one
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: OTHER_UUID }]),
          }),
        }),
      })

      const request = new NextRequest(`http://localhost/api/menu-items/${VALID_UUID}`, {
        method: "PUT",
        body: JSON.stringify({ name: "Duplicate Name" }),
      })
      const response = await PUT(request, { params: Promise.resolve({ id: VALID_UUID }) })

      expect(response.status).toBe(409)
      const data = await response.json()
      expect(data.code).toBe("MENU_ITEM_EXISTS")
    })

    it("should clear nullable fields when empty string is provided", async () => {
      const existingItem = {
        id: VALID_UUID,
        name: "Test Item",
        nameEn: "Test EN",
        category: "Main",
        price: "10.00",
        description: "Some description",
        image: "/image.jpg",
        available: true,
      }

      // After update, nullable fields should be null in DB
      const updatedItem = {
        ...existingItem,
        nameEn: null,
        description: null,
        image: null
      }

      // First call: check if item exists
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existingItem]),
          }),
        }),
      })

      // Second call: check for duplicates
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedItem]),
          }),
        }),
      })

      const request = new NextRequest(`http://localhost/api/menu-items/${VALID_UUID}`, {
        method: "PUT",
        body: JSON.stringify({
          nameEn: "",
          description: "",
          image: ""
        }),
      })
      const response = await PUT(request, { params: Promise.resolve({ id: VALID_UUID }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      // nameEn is converted to "" by toMenuItemResponse when null
      expect(data.nameEn).toBe("")
      expect(data.description).toBeNull()
      expect(data.image).toBeNull()
    })
  })

  describe("DELETE /api/menu-items/[id]", () => {
    it("should return 400 for invalid UUID", async () => {
      const request = new NextRequest("http://localhost/api/menu-items/invalid-id", {
        method: "DELETE",
      })
      const response = await DELETE(request, { params: Promise.resolve({ id: "invalid-id" }) })

      expect(response.status).toBe(400)
    })

    it("should return 404 for non-existent item", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      const request = new NextRequest(`http://localhost/api/menu-items/${VALID_UUID}`, {
        method: "DELETE",
      })
      const response = await DELETE(request, { params: Promise.resolve({ id: VALID_UUID }) })

      expect(response.status).toBe(404)
    })

    it("should return 404 for already soft-deleted item", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: VALID_UUID, available: false }]),
          }),
        }),
      })

      const request = new NextRequest(`http://localhost/api/menu-items/${VALID_UUID}`, {
        method: "DELETE",
      })
      const response = await DELETE(request, { params: Promise.resolve({ id: VALID_UUID }) })

      expect(response.status).toBe(404)
    })

    it("should successfully soft-delete an available item", async () => {
      const existingItem = {
        id: VALID_UUID,
        name: "Test Item",
        nameEn: null,
        category: "Main",
        price: "10.00",
        description: null,
        image: null,
        available: true,
      }

      const deletedItem = { ...existingItem, available: false }

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existingItem]),
          }),
        }),
      })

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([deletedItem]),
          }),
        }),
      })

      const request = new NextRequest(`http://localhost/api/menu-items/${VALID_UUID}`, {
        method: "DELETE",
      })
      const response = await DELETE(request, { params: Promise.resolve({ id: VALID_UUID }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.name).toBe("Test Item")
      // Verify update was called with available: false
      expect(mockDb.update).toHaveBeenCalled()
    })
  })

  describe("GET /api/menu-items/deleted", () => {
    it("should return deleted menu items", async () => {
      const deletedItems = [
        { id: "1", name: "Deleted 1", nameEn: null, category: "Main", price: "10.00", description: null, image: null, available: false },
        { id: "2", name: "Deleted 2", nameEn: null, category: "Beverage", price: "5.00", description: null, image: null, available: false },
      ]

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(deletedItems),
          }),
        }),
      })

      const response = await GET_DELETED()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty("items")
      expect(data.items).toHaveLength(2)
    })
  })

  describe("POST /api/menu-items/[id]/restore", () => {
    it("should return 400 for invalid UUID", async () => {
      const request = new NextRequest("http://localhost/api/menu-items/invalid-id/restore", {
        method: "POST",
      })
      const response = await RESTORE(request, { params: Promise.resolve({ id: "invalid-id" }) })

      expect(response.status).toBe(400)
    })

    it("should return 404 for non-existent item", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      const request = new NextRequest(`http://localhost/api/menu-items/${VALID_UUID}/restore`, {
        method: "POST",
      })
      const response = await RESTORE(request, { params: Promise.resolve({ id: VALID_UUID }) })

      expect(response.status).toBe(404)
    })

    it("should return 404 for already available item", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: VALID_UUID, available: true }]),
          }),
        }),
      })

      const request = new NextRequest(`http://localhost/api/menu-items/${VALID_UUID}/restore`, {
        method: "POST",
      })
      const response = await RESTORE(request, { params: Promise.resolve({ id: VALID_UUID }) })

      expect(response.status).toBe(404)
    })

    it("should successfully restore a soft-deleted item", async () => {
      const deletedItem = {
        id: VALID_UUID,
        name: "Deleted Item",
        nameEn: null,
        category: "Main",
        price: "10.00",
        description: null,
        image: null,
        available: false,
      }

      const restoredItem = { ...deletedItem, available: true }

      // First call: check if item exists and is unavailable
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([deletedItem]),
          }),
        }),
      })

      // Second call: check for duplicates
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // no duplicate
          }),
        }),
      })

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([restoredItem]),
          }),
        }),
      })

      const request = new NextRequest(`http://localhost/api/menu-items/${VALID_UUID}/restore`, {
        method: "POST",
      })
      const response = await RESTORE(request, { params: Promise.resolve({ id: VALID_UUID }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.name).toBe("Deleted Item")
    })

    it("should return 409 when restoring would create duplicate", async () => {
      const deletedItem = {
        id: VALID_UUID,
        name: "Duplicate Name",
        nameEn: null,
        category: "Main",
        price: "10.00",
        description: null,
        image: null,
        available: false,
      }

      // First call: check if item exists and is unavailable
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([deletedItem]),
          }),
        }),
      })

      // Second call: check for duplicates - found one
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: OTHER_UUID }]),
          }),
        }),
      })

      const request = new NextRequest(`http://localhost/api/menu-items/${VALID_UUID}/restore`, {
        method: "POST",
      })
      const response = await RESTORE(request, { params: Promise.resolve({ id: VALID_UUID }) })

      expect(response.status).toBe(409)
      const data = await response.json()
      expect(data.code).toBe("RESTORE_CONFLICT")
    })
  })
})
