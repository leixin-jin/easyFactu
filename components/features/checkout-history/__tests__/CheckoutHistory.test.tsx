import type { ReactElement } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { CheckoutHistory } from "../CheckoutHistory"

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

describe("CheckoutHistory", () => {
  it("renders checkout rows and opens reversal dialog", async () => {
    renderWithQueryClient(<CheckoutHistory />)

    expect(await screen.findByText("tx-1")).toBeInTheDocument()
    expect(screen.getByText("A1")).toBeInTheDocument()
    expect(screen.getByText("€12.30")).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getAllByRole("button", { name: "反结算" })[0])

    expect(await screen.findByText("整单反结算将回退所有菜品的已付数量")).toBeInTheDocument()
  })
})

