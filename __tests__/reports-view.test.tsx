import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { ReportsView } from "@/components/reports-view"

vi.mock("recharts", async () => {
  const React = (await import("react")).default
  const actual = await vi.importActual<any>("recharts")
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => {
      if (!children) return null
      return React.cloneElement(children, { width: 800, height: 260 })
    },
  }
})

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
    },
  })

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe("ReportsView", () => {
  it("defaults to month, removes peak hours/avg turnover, and shows category in top items", async () => {
    const user = userEvent.setup()
    renderWithQuery(<ReportsView />)

    expect(screen.getByText("数据报表")).toBeInTheDocument()
    expect(screen.queryByText("高峰时段")).not.toBeInTheDocument()
    expect(screen.queryByText("平均翻台时长")).not.toBeInTheDocument()
    expect(screen.getByText("现金 vs 银行")).toBeInTheDocument()

    await screen.findByText("€3200")
    expect(screen.getByRole("combobox")).toHaveTextContent("本月")

    await user.click(screen.getByRole("tab", { name: "热销菜品" }))
    await screen.findByText("主食")
    await screen.findByText("饮料")
  })

  it("switches granularity and re-renders data", async () => {
    const user = userEvent.setup()
    renderWithQuery(<ReportsView />)

    await screen.findByText("€3200")

    await user.click(screen.getByRole("combobox"))
    await user.click(screen.getByRole("option", { name: "本年" }))

    await screen.findByText("€12000")
  })
})
