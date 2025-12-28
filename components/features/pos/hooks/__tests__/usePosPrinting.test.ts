import { renderHook } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { usePosPrinting } from "../usePosPrinting"

// Mock next/navigation
const mockPush = vi.fn()
vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: mockPush,
    }),
}))

describe("usePosPrinting", () => {
    const mockOnPrintComplete = vi.fn()
    const mockPrint = vi.fn()

    const defaultPrintData = {
        mode: "full" as const,
        orderId: "order-1",
        tableNumber: "A1",
        paidAt: "2024-01-01 12:00:00",
        paymentMethod: "cash",
        subtotal: 100,
        discountPercent: 0,
        discountAmount: 0,
        total: 100,
        receivedAmount: 100,
        changeAmount: 0,
        items: [{ name: "测试菜品", quantity: 1, unitPrice: 100, totalPrice: 100 }],
    }

    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers()
        // Mock window.print
        Object.defineProperty(window, "print", {
            value: mockPrint,
            writable: true,
        })
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it("should not trigger print when not printing", () => {
        renderHook(() =>
            usePosPrinting({
                printData: defaultPrintData,
                isPrinting: false,
                onPrintComplete: mockOnPrintComplete,
            })
        )

        vi.advanceTimersByTime(100)

        expect(mockPrint).not.toHaveBeenCalled()
        expect(mockOnPrintComplete).not.toHaveBeenCalled()
        expect(mockPush).not.toHaveBeenCalled()
    })

    it("should not trigger print when no printData", () => {
        renderHook(() =>
            usePosPrinting({
                printData: null,
                isPrinting: true,
                onPrintComplete: mockOnPrintComplete,
            })
        )

        vi.advanceTimersByTime(100)

        expect(mockPrint).not.toHaveBeenCalled()
        expect(mockOnPrintComplete).not.toHaveBeenCalled()
        expect(mockPush).not.toHaveBeenCalled()
    })

    it("should trigger print and navigate when isPrinting and has printData", () => {
        renderHook(() =>
            usePosPrinting({
                printData: defaultPrintData,
                isPrinting: true,
                onPrintComplete: mockOnPrintComplete,
            })
        )

        vi.advanceTimersByTime(100)

        expect(mockPrint).toHaveBeenCalled()
        expect(mockOnPrintComplete).toHaveBeenCalled()
        expect(mockPush).toHaveBeenCalledWith("/tables")
    })

    it("should cleanup timer on unmount", () => {
        const { unmount } = renderHook(() =>
            usePosPrinting({
                printData: defaultPrintData,
                isPrinting: true,
                onPrintComplete: mockOnPrintComplete,
            })
        )

        unmount()
        vi.advanceTimersByTime(100)

        // 由于 unmount 触发了 cleanup，print 不应该被调用
        expect(mockPrint).not.toHaveBeenCalled()
    })
})
