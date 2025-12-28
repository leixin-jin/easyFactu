"use client"

import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api"

export const checkoutHistoryKeys = {
  all: ["checkoutHistory"] as const,
  list: (limit: number) => [...checkoutHistoryKeys.all, "list", limit] as const,
}

export function useCheckoutHistoryQuery({ limit = 50 }: { limit?: number } = {}) {
  return useQuery({
    queryKey: checkoutHistoryKeys.list(limit),
    queryFn: () => api.checkoutHistory.list({ limit }),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

