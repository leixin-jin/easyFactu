import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { usePosDialogs } from "../usePosDialogs"

// Mock useToast
vi.mock("@/hooks/use-toast", () => ({
    useToast: () => ({
        toast: vi.fn(),
    }),
}))

describe("usePosDialogs", () => {
    const defaultParams = {
        selectedTable: "table-1",
        loadingOrder: false,
        batches: [{ batchNo: 1, items: [{ id: "item-1", name: "测试菜品", price: 10, quantity: 1 }] }],
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("should initialize with dialogs closed", () => {
        const { result } = renderHook(() => usePosDialogs(defaultParams))
        expect(result.current.splitDialogOpen).toBe(false)
        expect(result.current.mergeDialogOpen).toBe(false)
    })

    it("should open split dialog when table selected and has batches", () => {
        const { result } = renderHook(() => usePosDialogs(defaultParams))
        act(() => {
            result.current.openSplitDialog()
        })
        expect(result.current.splitDialogOpen).toBe(true)
    })

    it("should allow direct setter for onOpenChange compatibility", () => {
        const { result } = renderHook(() => usePosDialogs(defaultParams))
        act(() => {
            result.current.setSplitDialogOpen(true)
        })
        expect(result.current.splitDialogOpen).toBe(true)
        act(() => {
            result.current.setSplitDialogOpen(false)
        })
        expect(result.current.splitDialogOpen).toBe(false)
    })

    it("should not open split dialog when no table selected", () => {
        const { result } = renderHook(() =>
            usePosDialogs({ ...defaultParams, selectedTable: "" })
        )
        act(() => {
            result.current.openSplitDialog()
        })
        expect(result.current.splitDialogOpen).toBe(false)
    })

    it("should not open split dialog when order is loading", () => {
        const { result } = renderHook(() =>
            usePosDialogs({ ...defaultParams, loadingOrder: true })
        )
        act(() => {
            result.current.openSplitDialog()
        })
        expect(result.current.splitDialogOpen).toBe(false)
    })

    it("should not open split dialog when no batches", () => {
        const { result } = renderHook(() =>
            usePosDialogs({ ...defaultParams, batches: [] })
        )
        act(() => {
            result.current.openSplitDialog()
        })
        expect(result.current.splitDialogOpen).toBe(false)
    })

    it("should open merge dialog when table selected", () => {
        const { result } = renderHook(() => usePosDialogs(defaultParams))
        act(() => {
            result.current.openMergeDialog()
        })
        expect(result.current.mergeDialogOpen).toBe(true)
    })

    it("should not open merge dialog when no table selected", () => {
        const { result } = renderHook(() =>
            usePosDialogs({ ...defaultParams, selectedTable: "" })
        )
        act(() => {
            result.current.openMergeDialog()
        })
        expect(result.current.mergeDialogOpen).toBe(false)
    })
})
