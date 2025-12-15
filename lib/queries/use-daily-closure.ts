"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type {
  ConfirmDailyClosureInput,
  CreateDailyClosureAdjustmentInput,
  DailyClosureResponse,
} from "@/types/api"

export const dailyClosureKeys = {
  all: ["dailyClosure"] as const,
  current: () => [...dailyClosureKeys.all, "current"] as const,
}

export function useDailyClosureQuery() {
  return useQuery({
    queryKey: dailyClosureKeys.current(),
    queryFn: () => api.dailyClosure.get(),
    staleTime: 0,
    refetchOnMount: true,
  })
}

export function useConfirmDailyClosure() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ConfirmDailyClosureInput) => api.dailyClosures.confirm(data),
    onSuccess: () => {
      // 刷新当前预览（生成报告后开启新区间）
      queryClient.invalidateQueries({ queryKey: dailyClosureKeys.current() })
    },
  })
}

export function useCreateDailyClosureAdjustment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      closureId,
      data,
    }: {
      closureId: string
      data: CreateDailyClosureAdjustmentInput
    }) => api.dailyClosures.createAdjustment(closureId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyClosureKeys.current() })
    },
  })
}
