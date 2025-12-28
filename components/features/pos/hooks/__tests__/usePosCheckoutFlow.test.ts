import { renderHook, act, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, Mock } from "vitest"
import { usePosCheckoutFlow } from "../usePosCheckoutFlow"

// Mock dependencies
const mockToast = vi.fn()
const mockMutateAsync = vi.fn()

vi.mock("@/hooks/use-toast", () => ({
    useToast: () => ({
        toast: mockToast,
    }),
}))

vi.mock("@/lib/queries", () => ({
    useCheckout: () => ({
        mutateAsync: mockMutateAsync,
        isPending: false,
    }),
}))

describe("usePosCheckoutFlow", () => {
    const defaultParams = {
        selectedTable: "table-1",
        cart: [],
        batches: [{ batchNo: 1, items: [{ id: "item-1", name: "测试菜品", price: 10, quantity: 1 }] }],
        currentOrder: { id: "order-1", tableId: "table-1", status: "open", subtotal: 10, discount: 0, total: 10, paymentMethod: null, createdAt: "", closedAt: null },
        tables: [{ id: "table-1", number: "A1", status: "occupied" as const }],
        tableNumberParam: "A1",
        checkoutState: {
            dialogOpen: true,
            discountPercent: 0,
            paymentMethod: "cash",
            receivedAmount: 10,
            aaMode: false,
            aaItems: [],
        },
        checkoutActions: {
            openFullCheckout: vi.fn(),
            openAACheckout: vi.fn(),
            closeCheckout: vi.fn(),
            resetCheckout: vi.fn(),
        },
        aggregatedItems: [{ id: "item-1", name: "测试菜品", quantity: 1, price: 10 }],
        checkoutSubtotal: 10,
        checkoutDiscountAmount: 0,
        checkoutTotal: 10,
        clearCart: vi.fn(),
        reloadTables: vi.fn().mockResolvedValue(undefined),
        applyOrderState: vi.fn(),
        setOrderError: vi.fn(),
    }

    beforeEach(() => {
        vi.clearAllMocks()
        mockMutateAsync.mockResolvedValue({ order: null, batches: [] })
    })

    it("should initialize with correct default values", () => {
        const { result } = renderHook(() => usePosCheckoutFlow(defaultParams))
        expect(result.current.printData).toBe(null)
        expect(result.current.isPrinting).toBe(false)
        expect(result.current.isCheckoutLoading).toBe(false)
    })

    it("should not checkout when no table selected", async () => {
        const { result } = renderHook(() =>
            usePosCheckoutFlow({ ...defaultParams, selectedTable: "" })
        )
        await act(async () => {
            await result.current.handleCheckout()
        })
        expect(mockToast).toHaveBeenCalledWith(
            expect.objectContaining({ title: "未选择桌台" })
        )
        expect(mockMutateAsync).not.toHaveBeenCalled()
    })

    it("should not checkout when cart has uncommitted items", async () => {
        const { result } = renderHook(() =>
            usePosCheckoutFlow({
                ...defaultParams,
                cart: [{ id: "cart-1", name: "未提交菜品", nameEn: "Test", category: "cat", price: 5, image: null, available: true, quantity: 1 }],
            })
        )
        await act(async () => {
            await result.current.handleCheckout()
        })
        expect(mockToast).toHaveBeenCalledWith(
            expect.objectContaining({ title: "存在未提交菜品" })
        )
        expect(mockMutateAsync).not.toHaveBeenCalled()
    })

    it("should not checkout when order is empty", async () => {
        const { result } = renderHook(() =>
            usePosCheckoutFlow({
                ...defaultParams,
                currentOrder: null,
                batches: [],
            })
        )
        await act(async () => {
            await result.current.handleCheckout()
        })
        expect(mockToast).toHaveBeenCalledWith(
            expect.objectContaining({ title: "当前订单为空" })
        )
        expect(mockMutateAsync).not.toHaveBeenCalled()
    })

    it("should not AA checkout when no items selected in AA mode", async () => {
        const { result } = renderHook(() =>
            usePosCheckoutFlow({
                ...defaultParams,
                checkoutState: {
                    ...defaultParams.checkoutState,
                    aaMode: true,
                    aaItems: [],
                },
            })
        )
        await act(async () => {
            await result.current.handleCheckout()
        })
        expect(mockToast).toHaveBeenCalledWith(
            expect.objectContaining({ title: "未选择 AA 菜品" })
        )
        expect(mockMutateAsync).not.toHaveBeenCalled()
    })

    it("should open AA checkout when conditions are met", () => {
        const { result } = renderHook(() => usePosCheckoutFlow(defaultParams))
        act(() => {
            result.current.handleAA()
        })
        expect(defaultParams.checkoutActions.openAACheckout).toHaveBeenCalled()
    })

    it("should not open AA checkout with uncommitted cart items", () => {
        const { result } = renderHook(() =>
            usePosCheckoutFlow({
                ...defaultParams,
                cart: [{ id: "cart-1", name: "未提交菜品", nameEn: "Test", category: "cat", price: 5, image: null, available: true, quantity: 1 }],
            })
        )
        act(() => {
            result.current.handleAA()
        })
        expect(mockToast).toHaveBeenCalledWith(
            expect.objectContaining({ title: "存在未提交菜品" })
        )
        expect(defaultParams.checkoutActions.openAACheckout).not.toHaveBeenCalled()
    })

    it("should open full checkout when conditions are met", () => {
        const { result } = renderHook(() => usePosCheckoutFlow(defaultParams))
        act(() => {
            result.current.handleOpenCheckout()
        })
        expect(defaultParams.checkoutActions.openFullCheckout).toHaveBeenCalled()
    })
})
