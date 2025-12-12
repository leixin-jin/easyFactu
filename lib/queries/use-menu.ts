"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { CreateMenuItemInput } from "@/types/api"

export const menuKeys = {
  all: ["menuItems"] as const,
  lists: () => [...menuKeys.all, "list"] as const,
}

export function useMenuItems() {
  return useQuery({
    queryKey: menuKeys.lists(),
    queryFn: () => api.menuItems.list(),
    staleTime: 5 * 60 * 1000, // 5 minutes - menu data changes less frequently
  })
}

export function useCreateMenuItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateMenuItemInput) => api.menuItems.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.all })
    },
  })
}

export function useDeleteMenuItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.menuItems.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.all })
    },
  })
}
