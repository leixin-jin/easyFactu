"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import { checkoutHistoryKeys } from "./use-checkout-history"

export const transactionKeys = {
  all: ["transactions"] as const,
  detail: (id: string) => [...transactionKeys.all, "detail", id] as const,
}

export function useTransactionDetailQuery(id: string | null) {
  return useQuery({
    queryKey: transactionKeys.detail(id ?? ""),
    queryFn: () => api.transactions.getDetail(id!),
    enabled: !!id,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useReverseTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.transactions.reverse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checkoutHistoryKeys.all })
      queryClient.invalidateQueries({ queryKey: transactionKeys.all })
    },
  })
}
