"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { CreateTableInput, TableResponse } from "@/types/api"

export const tableKeys = {
  all: ["tables"] as const,
  list: () => [...tableKeys.all, "list"] as const,
}

export function useTablesQuery() {
  return useQuery({
    queryKey: tableKeys.list(),
    queryFn: () => api.tables.list(),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
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
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: tableKeys.list() })
      const previousTables = queryClient.getQueryData<TableResponse[]>(tableKeys.list())

      queryClient.setQueryData<TableResponse[]>(tableKeys.list(), (old) =>
        old?.filter((table) => table.id !== id),
      )

      return { previousTables }
    },
    onError: (_err, _id, context) => {
      if (context?.previousTables) {
        queryClient.setQueryData(tableKeys.list(), context.previousTables)
      }
    },
  })
}
