"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { tableKeys } from "./use-tables"
import type {
  CreateOrderInput,
  ClearOrderInput,
  CheckoutInput,
  TransferOrderInput,
  UpdateOrderItemInput,
} from "@/types/api"

export const orderKeys = {
  all: ["orders"] as const,
  table: (tableId: string) => [...orderKeys.all, "table", tableId] as const,
}

export function useTableOrder(tableId: string) {
  return useQuery({
    queryKey: orderKeys.table(tableId),
    queryFn: () => api.orders.get(tableId),
    enabled: !!tableId,
    staleTime: 0, // Orders need to be real-time
    refetchOnWindowFocus: true,
  })
}

export function useCreateOrderBatch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateOrderInput) => api.orders.create(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.table(variables.tableId) })
      queryClient.invalidateQueries({ queryKey: tableKeys.all })
    },
  })
}

export function useUpdateOrderItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: UpdateOrderItemInput }) =>
      api.orders.updateItem(itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all })
      queryClient.invalidateQueries({ queryKey: tableKeys.all })
    },
  })
}

export function useClearOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ClearOrderInput) => api.orders.clear(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.table(variables.tableId) })
      queryClient.invalidateQueries({ queryKey: tableKeys.all })
    },
  })
}

export function useCheckout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CheckoutInput) => api.orders.checkout(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all })
      queryClient.invalidateQueries({ queryKey: tableKeys.all })
    },
  })
}

export function useTransferOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: TransferOrderInput) => api.orders.transfer(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.table(variables.sourceTableId) })
      queryClient.invalidateQueries({ queryKey: orderKeys.table(variables.targetTableId) })
      queryClient.invalidateQueries({ queryKey: tableKeys.all })
    },
  })
}
