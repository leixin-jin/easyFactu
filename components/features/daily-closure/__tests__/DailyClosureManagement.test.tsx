import type { ReactElement } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
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
  it("renders categories and filters items list", async () => {
    renderWithQueryClient(<DailyClosureManagement />)

    const user = userEvent.setup()

    await user.click(await screen.findByRole("tab", { name: "菜品明细" }))

    expect(await screen.findByText("宫保鸡丁")).toBeInTheDocument()
    expect(screen.getByText("可乐")).toBeInTheDocument()

    await user.click(screen.getByRole("combobox", { name: "分类筛选" }))
    await user.click(await screen.findByRole("option", { name: "饮料" }))

    expect(screen.queryByText("宫保鸡丁")).not.toBeInTheDocument()
    expect(screen.getByText("可乐")).toBeInTheDocument()
  })
})
