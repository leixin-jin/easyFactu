// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { NextRequest } from "next/server"
import { eq } from "drizzle-orm"
import { randomUUID } from "crypto"

import { getDb } from "@/lib/db"
import { menuItems, orderItems, orders, restaurantTables } from "@/db/schema"
import { POST } from "@/app/api/orders/route"

const hasDatabase = Boolean(process.env.DATABASE_URL)
const describeIfDb = hasDatabase ? describe : describe.skip

describeIfDb("orders integration", () => {
  const tableId = randomUUID()
  const menuItemId = randomUUID()
  const tableNumber = `T-${Date.now()}`
  const notes = "no spicy"
  let createdOrderId: string | null = null

  beforeAll(async () => {
    const db = getDb()

    await db.insert(restaurantTables).values({
      id: tableId,
      number: tableNumber,
      capacity: 2,
      status: "idle",
      currentGuests: 0,
      amount: "0",
    })

    await db.insert(menuItems).values({
      id: menuItemId,
      name: "Test Item",
      category: "Main",
      price: "10.00",
      available: true,
    })
  })

  afterAll(async () => {
    if (!hasDatabase) return
    const db = getDb()

    if (createdOrderId) {
      await db.delete(orders).where(eq(orders.id, createdOrderId))
    }

    await db.delete(menuItems).where(eq(menuItems.id, menuItemId))
    await db.delete(restaurantTables).where(eq(restaurantTables.id, tableId))

    const pool = (globalThis as { __drizzle_pool__?: { end?: () => Promise<void> } })
      .__drizzle_pool__
    if (pool?.end) {
      await pool.end()
    }
  })

  it("persists order item notes", async () => {
    const request = new NextRequest("http://localhost/api/orders", {
      method: "POST",
      body: JSON.stringify({
        tableId,
        items: [
          {
            menuItemId,
            quantity: 1,
            notes,
          },
        ],
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(201)

    const data = await response.json()
    createdOrderId = data.order?.id ?? null
    expect(createdOrderId).toBeTruthy()

    const db = getDb()
    const [row] = await db
      .select({ notes: orderItems.notes })
      .from(orderItems)
      .where(eq(orderItems.orderId, createdOrderId!))
      .limit(1)

    expect(row?.notes).toBe(notes)
  })
})
