import { http, HttpResponse } from "msw"

export const handlers = [
  http.get("/api/reports", ({ request }) => {
    const url = new URL(request.url)
    const granularity = (url.searchParams.get("granularity") ?? "month") as
      | "day"
      | "week"
      | "month"
      | "year"

    const base = granularity === "year" ? 12000 : granularity === "month" ? 3200 : 200

    return HttpResponse.json({
      range: {
        granularity,
        startAt: new Date(2025, 11, 1).toISOString(),
        endAt: new Date(2026, 0, 1).toISOString(),
      },
      kpis: {
        grossRevenue: base,
        ordersCount: granularity === "year" ? 480 : 120,
        averageOrderValueGross: granularity === "year" ? 25 : 26.67,
        cashAmount: base * 0.25,
        bankAmount: base * 0.75,
        cashRatio: 0.25,
        bankRatio: 0.75,
      },
      salesTrend: [
        { bucket: new Date(2025, 11, 1).toISOString(), revenue: base * 0.2 },
        { bucket: new Date(2025, 11, 2).toISOString(), revenue: base * 0.4 },
        { bucket: new Date(2025, 11, 3).toISOString(), revenue: base * 0.3 },
      ],
      topItems: [
        { menuItemId: "m1", name: "宫保鸡丁", category: "主食", quantitySold: 12, revenueAmount: 336 },
        { menuItemId: "m3", name: "可乐", category: "饮料", quantitySold: 30, revenueAmount: 150 },
      ],
    })
  }),

  http.get("/api/restaurant-tables", () => {
    return HttpResponse.json([
      { id: "1", number: "A-01", status: "idle", capacity: 4, area: null, amount: null },
      { id: "2", number: "A-02", status: "occupied", capacity: 4, area: null, amount: 25.5 },
      { id: "3", number: "B-01", status: "idle", capacity: 6, area: "户外", amount: null },
    ])
  }),

  http.post("/api/restaurant-tables", async ({ request }) => {
    const body = await request.json() as { number: string; capacity: number; area?: string }
    if (!body.number || !body.capacity) {
      return HttpResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      )
    }
    return HttpResponse.json(
      {
        id: "new-table-id",
        number: body.number,
        capacity: body.capacity,
        area: body.area ?? null,
        status: "idle",
      },
      { status: 201 },
    )
  }),

  http.get("/api/menu-items", () => {
    return HttpResponse.json({
      categories: [
        { id: "all", name: "全部菜品", count: 3 },
        { id: "主食", name: "主食", count: 2 },
        { id: "饮料", name: "饮料", count: 1 },
      ],
      items: [
        { id: "m1", name: "宫保鸡丁", nameEn: "Kung Pao Chicken", category: "主食", price: 28, description: null, image: null },
        { id: "m2", name: "扬州炒饭", nameEn: "Yangzhou Fried Rice", category: "主食", price: 18, description: null, image: null },
        { id: "m3", name: "可乐", nameEn: "Cola", category: "饮料", price: 5, description: null, image: null },
      ],
    })
  }),

  http.post("/api/menu-items", async ({ request }) => {
    const body = await request.json() as { name?: string; category?: string; price?: number }
    if (!body.name || !body.category || !body.price) {
      return HttpResponse.json(
        { error: "Invalid request body", detail: { fieldErrors: { name: ["Required"], category: ["Required"], price: ["Required"] } } },
        { status: 400 },
      )
    }
    return HttpResponse.json(
      {
        id: "new-item-id",
        name: body.name,
        nameEn: null,
        category: body.category,
        price: body.price,
        description: null,
        image: null,
      },
      { status: 201 },
    )
  }),

  http.get("/api/orders", ({ request }) => {
    const url = new URL(request.url)
    const tableId = url.searchParams.get("tableId")

    if (!tableId) {
      return HttpResponse.json({ error: "Missing tableId" }, { status: 400 })
    }

    if (tableId === "empty-table") {
      return HttpResponse.json({ order: null, batches: [] })
    }

    return HttpResponse.json({
      order: {
        id: "order-1",
        tableId,
        status: "open",
        subtotal: 46,
        discount: 0,
        total: 46,
        totalAmount: 46,
        paidAmount: 0,
        paymentMethod: null,
        createdAt: new Date().toISOString(),
        closedAt: null,
      },
      batches: [
        {
          batchNo: 1,
          items: [
            { id: "oi1", menuItemId: "m1", name: "宫保鸡丁", nameEn: "Kung Pao Chicken", quantity: 1, price: 28, notes: null, createdAt: new Date().toISOString() },
            { id: "oi2", menuItemId: "m2", name: "扬州炒饭", nameEn: "Yangzhou Fried Rice", quantity: 1, price: 18, notes: null, createdAt: new Date().toISOString() },
          ],
        },
      ],
    })
  }),

  http.post("/api/orders", async ({ request }) => {
    const body = await request.json() as { tableId?: string; items?: { menuItemId: string; quantity: number }[] }
    if (!body.tableId || !body.items || body.items.length === 0) {
      return HttpResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      )
    }
    return HttpResponse.json(
      {
        order: {
          id: "new-order-id",
          tableId: body.tableId,
          status: "open",
          subtotal: 46,
          discount: 0,
          total: 46,
          paymentMethod: null,
          createdAt: new Date().toISOString(),
          closedAt: null,
        },
        batches: [
          {
            batchNo: 1,
            items: body.items.map((item, idx) => ({
              id: `new-oi-${idx}`,
              menuItemId: item.menuItemId,
              name: "Test Item",
              nameEn: "",
              quantity: item.quantity,
              price: 10,
              notes: null,
              createdAt: new Date().toISOString(),
            })),
          },
        ],
      },
      { status: 201 },
    )
  }),

  http.get("/api/daily-closure", () => {
    const now = new Date()
    const periodEndAt = now.toISOString()
    const periodStartAt = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString()

    return HttpResponse.json({
      periodStartAt,
      periodEndAt,
      sequenceNo: null,
      taxRate: 0.1,
      locked: false,
      closureId: null,
      lockedAt: null,
      overview: {
        grossRevenue: 71,
        netRevenue: 64.55,
        ordersCount: 2,
        averageOrderValueGross: 35.5,
        averageOrderValueNet: 32.28,
        refundAmount: 0,
        voidAmount: 0,
      },
      payments: {
        expectedTotal: 71,
        actualTotal: 71,
        difference: 0,
        cashExpectedTotal: 20,
        cashActualTotal: 20,
        nonCashExpectedTotal: 51,
        nonCashActualTotal: 51,
        lines: [
          {
            paymentMethod: "cash",
            paymentGroup: "cash",
            expectedAmount: 20,
            adjustmentsAmount: 0,
            actualAmount: 20,
          },
          {
            paymentMethod: "visa",
            paymentGroup: "card",
            expectedAmount: 51,
            adjustmentsAmount: 0,
            actualAmount: 51,
          },
        ],
      },
      items: {
        categories: ["主食", "饮料"],
        lines: [
          {
            menuItemId: "m1",
            name: "宫保鸡丁",
            category: "主食",
            quantitySold: 2,
            revenueAmount: 56,
            discountImpactAmount: 0,
          },
          {
            menuItemId: "m3",
            name: "可乐",
            category: "饮料",
            quantitySold: 3,
            revenueAmount: 15,
            discountImpactAmount: null,
          },
        ],
      },
      adjustments: [],
      meta: {
        refundVoidPolicy: "测试环境：退款/作废金额统计暂返回 0",
      },
    })
  }),
]
