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
  byDate: (date: string) => [...dailyClosureKeys.all, date] as const,
}

export function useDailyClosureQuery(date: string) {
  return useQuery({
    queryKey: dailyClosureKeys.byDate(date),
    queryFn: () => api.dailyClosure.get(date),
    staleTime: 0,
    refetchOnMount: true,
  })
}

export function useConfirmDailyClosure() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ConfirmDailyClosureInput) => api.dailyClosures.confirm(data),
    onSuccess: (data: DailyClosureResponse) => {
      queryClient.invalidateQueries({ queryKey: dailyClosureKeys.byDate(data.businessDate) })
    },
  })
}

export function useCreateDailyClosureAdjustment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      closureId,
      data,
      businessDate,
    }: {
      closureId: string
      data: CreateDailyClosureAdjustmentInput
      businessDate: string
    }) => api.dailyClosures.createAdjustment(closureId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: dailyClosureKeys.byDate(variables.businessDate) })
    },
  })
}

