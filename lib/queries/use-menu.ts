"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { CreateMenuItemInput, MenuListResponse, MenuItemResponse } from "@/types/api"

export const menuKeys = {
  all: ["menuItems"] as const,
  list: () => [...menuKeys.all, "list"] as const,
}

export function useMenuQuery() {
  return useQuery({
    queryKey: menuKeys.list(),
    queryFn: () => api.menuItems.list(),
    staleTime: 5 * 60 * 1000, // 5 minutes - menu data can be cached longer
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
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: menuKeys.list() })
      const previousData = queryClient.getQueryData<MenuListResponse>(menuKeys.list())

      queryClient.setQueryData<MenuListResponse>(menuKeys.list(), (old) => {
        if (!old) return old
        const newItems = old.items.filter((item: MenuItemResponse) => item.id !== id)
        const newCategories = rebuildCategories(newItems)
        return { items: newItems, categories: newCategories }
      })

      return { previousData }
    },
    onError: (_err, _id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(menuKeys.list(), context.previousData)
      }
    },
  })
}

function rebuildCategories(items: MenuItemResponse[]) {
  const counts = new Map<string, number>()
  for (const item of items) {
    counts.set(item.category, (counts.get(item.category) ?? 0) + 1)
  }

  return [
    { id: "all", name: "全部菜品", count: items.length },
    ...Array.from(counts.entries()).map(([id, count]) => ({
      id,
      name: id,
      count,
    })),
  ]
}
