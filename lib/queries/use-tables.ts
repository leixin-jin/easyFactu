"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { TableResponse, CreateTableInput } from "@/types/api"

export const tableKeys = {
  all: ["tables"] as const,
  lists: () => [...tableKeys.all, "list"] as const,
}

export function useTables() {
  return useQuery({
    queryKey: tableKeys.lists(),
    queryFn: () => api.tables.list(),
    staleTime: 30 * 1000, // 30 seconds
  })
}

export function useCreateTable() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateTableInput) => api.tables.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tableKeys.all })
    },
  })
}

export function useDeleteTable() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.tables.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tableKeys.all })
    },
  })
}

// Helper to transform TableResponse to view model
export function toTableView(table: TableResponse) {
  return {
    id: table.id,
    number: table.number,
    area: table.area,
    capacity: table.capacity,
    status: table.status,
    amount: table.amount,
  }
}
