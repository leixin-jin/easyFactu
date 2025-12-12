import { renderHook, act } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { useCheckout } from "../useCheckout"
import type { OrderBatchView } from "@/lib/order-utils"
import type { CartItem } from "@/types/pos"

describe("useCheckout", () => {
  const emptyArgs = { batches: [], cart: [] }

  const mockBatches: OrderBatchView[] = [
    {
      batchNo: 1,
      items: [
        { id: "oi1", menuItemId: "m1", name: "Item 1", nameEn: "", quantity: 2, price: 10, notes: null, createdAt: "" },
        { id: "oi2", menuItemId: "m2", name: "Item 2", nameEn: "", quantity: 1, price: 20, notes: null, createdAt: "" },
      ],
    },
  ]

  const mockCart: CartItem[] = [
    { id: "m3", name: "Cart Item", nameEn: "", price: 15, quantity: 3, notes: null },
  ]

  it("should initialize with correct default state", () => {
    const { result } = renderHook(() => useCheckout(emptyArgs))

    expect(result.current.state.dialogOpen).toBe(false)
    expect(result.current.state.aaMode).toBe(false)
    expect(result.current.state.discountPercent).toBe(0)
    expect(result.current.state.paymentMethod).toBe("cash")
    expect(result.current.state.receivedAmount).toBe(0)
    expect(result.current.state.aaItems).toEqual([])
  })

  it("should calculate subtotal correctly from batches", () => {
    const { result } = renderHook(() => useCheckout({ batches: mockBatches, cart: [] }))

    expect(result.current.subtotal).toBe(40)
  })

  it("should calculate subtotal correctly from cart", () => {
    const { result } = renderHook(() => useCheckout({ batches: [], cart: mockCart }))

    expect(result.current.subtotal).toBe(45)
  })

  it("should calculate combined subtotal from batches and cart", () => {
    const { result } = renderHook(() => useCheckout({ batches: mockBatches, cart: mockCart }))

    expect(result.current.subtotal).toBe(85)
  })

  it("should aggregate items by menuItemId", () => {
    const batchesWithDuplicate: OrderBatchView[] = [
      {
        batchNo: 1,
        items: [
          { id: "oi1", menuItemId: "m1", name: "Item 1", nameEn: "", quantity: 2, price: 10, notes: null, createdAt: "" },
        ],
      },
      {
        batchNo: 2,
        items: [
          { id: "oi2", menuItemId: "m1", name: "Item 1", nameEn: "", quantity: 1, price: 10, notes: null, createdAt: "" },
        ],
      },
    ]
    const { result } = renderHook(() => useCheckout({ batches: batchesWithDuplicate, cart: [] }))

    const aggregated = result.current.aggregatedItems
    expect(aggregated).toHaveLength(1)
    expect(aggregated[0].quantity).toBe(3)
  })

  describe("openFullCheckout", () => {
    it("should open dialog in full mode", () => {
      const { result } = renderHook(() => useCheckout(emptyArgs))

      act(() => {
        result.current.actions.openFullCheckout()
      })

      expect(result.current.state.dialogOpen).toBe(true)
      expect(result.current.state.aaMode).toBe(false)
    })
  })

  describe("openAACheckout", () => {
    it("should open dialog in AA mode", () => {
      const { result } = renderHook(() => useCheckout(emptyArgs))

      act(() => {
        result.current.actions.openAACheckout()
      })

      expect(result.current.state.dialogOpen).toBe(true)
      expect(result.current.state.aaMode).toBe(true)
    })
  })

  describe("closeCheckout", () => {
    it("should close dialog and reset state", () => {
      const { result } = renderHook(() => useCheckout(emptyArgs))

      act(() => {
        result.current.actions.openFullCheckout()
        result.current.actions.setReceivedAmount(100)
      })

      act(() => {
        result.current.actions.closeCheckout()
      })

      expect(result.current.state.dialogOpen).toBe(false)
      expect(result.current.state.receivedAmount).toBe(0)
    })
  })

  describe("discount calculations", () => {
    it("should calculate discount amount correctly", () => {
      const { result } = renderHook(() => useCheckout({ batches: mockBatches, cart: [] }))

      act(() => {
        result.current.actions.setDiscount(10)
      })

      expect(result.current.discountAmount).toBe(4)
      expect(result.current.total).toBe(36)
    })

    it("should update checkout totals with discount", () => {
      const { result } = renderHook(() => useCheckout({ batches: mockBatches, cart: [] }))

      act(() => {
        result.current.actions.openFullCheckout()
        result.current.actions.setDiscount(25)
      })

      expect(result.current.checkoutDiscountAmount).toBe(10)
      expect(result.current.checkoutTotal).toBe(30)
    })
  })

  describe("payment method", () => {
    it("should update payment method", () => {
      const { result } = renderHook(() => useCheckout(emptyArgs))

      act(() => {
        result.current.actions.setPaymentMethod("card")
      })

      expect(result.current.state.paymentMethod).toBe("card")
    })
  })

  describe("received amount and change", () => {
    it("should calculate change correctly", () => {
      const { result } = renderHook(() => useCheckout({ batches: mockBatches, cart: [] }))

      act(() => {
        result.current.actions.openFullCheckout()
        result.current.actions.setReceivedAmount(50)
      })

      expect(result.current.changeAmount).toBe(10)
    })

    it("should return 0 change when received is less than total", () => {
      const { result } = renderHook(() => useCheckout({ batches: mockBatches, cart: [] }))

      act(() => {
        result.current.actions.openFullCheckout()
        result.current.actions.setReceivedAmount(30)
      })

      expect(result.current.changeAmount).toBe(-10)
    })
  })

  describe("AA mode item selection", () => {
    it("should add AA item", () => {
      const { result } = renderHook(() => useCheckout({ batches: mockBatches, cart: [] }))

      act(() => {
        result.current.actions.openAACheckout()
        result.current.actions.upsertAaItem({ id: "m1", name: "Item 1", price: 10, quantity: 1 })
      })

      expect(result.current.state.aaItems).toHaveLength(1)
      expect(result.current.aaSubtotal).toBe(10)
    })

    it("should remove AA item", () => {
      const { result } = renderHook(() => useCheckout({ batches: mockBatches, cart: [] }))

      act(() => {
        result.current.actions.openAACheckout()
        result.current.actions.upsertAaItem({ id: "m1", name: "Item 1", price: 10, quantity: 1 })
      })

      act(() => {
        result.current.actions.removeAaItem("m1")
      })

      expect(result.current.state.aaItems).toHaveLength(0)
    })

    it("should calculate AA checkout total", () => {
      const { result } = renderHook(() => useCheckout({ batches: mockBatches, cart: [] }))

      act(() => {
        result.current.actions.openAACheckout()
        result.current.actions.upsertAaItem({ id: "m1", name: "Item 1", price: 10, quantity: 2 })
        result.current.actions.setDiscount(10)
      })

      expect(result.current.checkoutSubtotal).toBe(20)
      expect(result.current.checkoutTotal).toBe(18)
    })

    it("should clear AA items", () => {
      const { result } = renderHook(() => useCheckout({ batches: mockBatches, cart: [] }))

      act(() => {
        result.current.actions.openAACheckout()
        result.current.actions.upsertAaItem({ id: "m1", name: "Item 1", price: 10, quantity: 1 })
        result.current.actions.upsertAaItem({ id: "m2", name: "Item 2", price: 20, quantity: 1 })
      })

      act(() => {
        result.current.actions.clearAaItems()
      })

      expect(result.current.state.aaItems).toHaveLength(0)
    })
  })

  describe("AA quantity dialog", () => {
    it("should open quantity dialog", () => {
      const { result } = renderHook(() => useCheckout({ batches: mockBatches, cart: [] }))

      act(() => {
        result.current.actions.openAACheckout()
        result.current.actions.openAaQuantityDialog(
          { itemId: "m1", name: "Item 1", maxQuantity: 5, price: 10 },
          2,
        )
      })

      expect(result.current.state.aaQuantityDialogOpen).toBe(true)
      expect(result.current.state.aaQuantityTarget?.itemId).toBe("m1")
      expect(result.current.state.aaQuantityInput).toBe(2)
    })

    it("should confirm quantity and add item", () => {
      const { result } = renderHook(() => useCheckout({ batches: mockBatches, cart: [] }))

      act(() => {
        result.current.actions.openAACheckout()
        result.current.actions.openAaQuantityDialog(
          { itemId: "m1", name: "Item 1", maxQuantity: 5, price: 10 },
          1,
        )
      })

      act(() => {
        result.current.actions.confirmAaQuantity(3)
      })

      expect(result.current.state.aaQuantityDialogOpen).toBe(false)
      expect(result.current.state.aaItems).toHaveLength(1)
      expect(result.current.state.aaItems[0].quantity).toBe(3)
    })

    it("should clamp quantity to max", () => {
      const { result } = renderHook(() => useCheckout({ batches: mockBatches, cart: [] }))

      act(() => {
        result.current.actions.openAACheckout()
        result.current.actions.openAaQuantityDialog(
          { itemId: "m1", name: "Item 1", maxQuantity: 5, price: 10 },
          1,
        )
      })

      act(() => {
        result.current.actions.confirmAaQuantity(10)
      })

      expect(result.current.state.aaItems[0].quantity).toBe(5)
    })
  })

  describe("totalItemsCount", () => {
    it("should count all items", () => {
      const { result } = renderHook(() => useCheckout({ batches: mockBatches, cart: mockCart }))

      expect(result.current.totalItemsCount).toBe(6)
    })
  })

  describe("maxExistingBatchNo", () => {
    it("should return max batch number", () => {
      const multiBatch: OrderBatchView[] = [
        { batchNo: 1, items: [] },
        { batchNo: 3, items: [] },
        { batchNo: 2, items: [] },
      ]
      const { result } = renderHook(() => useCheckout({ batches: multiBatch, cart: [] }))

      expect(result.current.maxExistingBatchNo).toBe(3)
    })

    it("should return 0 when no batches", () => {
      const { result } = renderHook(() => useCheckout(emptyArgs))

      expect(result.current.maxExistingBatchNo).toBe(0)
    })
  })

  describe("resetCheckout", () => {
    it("should reset all state", () => {
      const { result } = renderHook(() => useCheckout({ batches: mockBatches, cart: [] }))

      act(() => {
        result.current.actions.openAACheckout()
        result.current.actions.setDiscount(20)
        result.current.actions.setPaymentMethod("card")
        result.current.actions.upsertAaItem({ id: "m1", name: "Item 1", price: 10, quantity: 1 })
      })

      act(() => {
        result.current.actions.resetCheckout()
      })

      expect(result.current.state.dialogOpen).toBe(false)
      expect(result.current.state.aaMode).toBe(false)
      expect(result.current.state.discountPercent).toBe(0)
      expect(result.current.state.paymentMethod).toBe("cash")
      expect(result.current.state.aaItems).toHaveLength(0)
    })
  })
})
