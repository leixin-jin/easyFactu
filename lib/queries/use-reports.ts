"use client"

import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { ReportGranularity } from "@/types/api"

export const reportsKeys = {
  all: ["reports"] as const,
  detail: (granularity: ReportGranularity) => [...reportsKeys.all, "detail", granularity] as const,
}

export function useReportsQuery(granularity: ReportGranularity) {
  return useQuery({
    queryKey: reportsKeys.detail(granularity),
    queryFn: () => api.reports.get(granularity),
    staleTime: 30 * 1000,
  })
}

