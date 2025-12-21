import type { ReactElement } from "react"
import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { DailyClosureManagement } from "../DailyClosureManagement"

function renderWithQueryClient(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe("DailyClosureManagement", () => {
  it("renders overview with KPI cards and category revenue summary", async () => {
    renderWithQueryClient(<DailyClosureManagement />)

    // 验证页面标题
    expect(screen.getByText("日结")).toBeInTheDocument()
    expect(screen.getByText("今日经营数据总览")).toBeInTheDocument()

    // 验证 KPI 卡片标签
    await waitFor(() => {
      expect(screen.getByText("营业额")).toBeInTheDocument()
    })
    expect(screen.getByText("订单数")).toBeInTheDocument()
    expect(screen.getByText("客单价")).toBeInTheDocument()
    expect(screen.getByText("现金 vs 银行")).toBeInTheDocument()

    // 验证菜品分类营业额汇总卡片
    expect(screen.getByText("菜品分类营业额")).toBeInTheDocument()

    // 验证分类数据显示（来自 mock 数据）
    expect(screen.getByText("主食")).toBeInTheDocument()
    expect(screen.getByText("饮料")).toBeInTheDocument()
  })

  it("displays correct cash/bank ratio calculation", async () => {
    renderWithQueryClient(<DailyClosureManagement />)

    // 等待数据加载完成
    await waitFor(() => {
      expect(screen.getByText("现金 vs 银行")).toBeInTheDocument()
    })

    // mock 数据: cashActualTotal=20, nonCashActualTotal=51, total=71
    // cashRatio = Math.round(20/71*100) = 28%
    // bankRatio = 100 - 28 = 72%
    expect(screen.getByText("28% / 72%")).toBeInTheDocument()

    // 验证金额显示
    expect(screen.getByText("€20.00 / €51.00")).toBeInTheDocument()
  })

  it("sorts category revenue by amount descending", async () => {
    renderWithQueryClient(<DailyClosureManagement />)

    // 等待数据加载完成
    await waitFor(() => {
      expect(screen.getByText("菜品分类营业额")).toBeInTheDocument()
    })

    // mock 数据: 主食=56, 饮料=15
    // 应该按营业额降序排列，主食在前
    const categorySection = screen.getByText("菜品分类营业额").closest("div")?.parentElement
    expect(categorySection).toBeInTheDocument()

    // 验证主食营业额 €56.00 和饮料营业额 €15.00 都显示
    expect(screen.getByText("€56.00")).toBeInTheDocument()
    expect(screen.getByText("€15.00")).toBeInTheDocument()

    // 验证排序：主食（56）应该在饮料（15）之前
    const mainDishElement = screen.getByText("主食")
    const drinkElement = screen.getByText("饮料")
    
    // 通过 DOM 位置验证排序
    const mainDishPosition = mainDishElement.compareDocumentPosition(drinkElement)
    // DOCUMENT_POSITION_FOLLOWING = 4 表示 drinkElement 在 mainDishElement 之后
    expect(mainDishPosition & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
