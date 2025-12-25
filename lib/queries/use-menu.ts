"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { CreateMenuItemInput, UpdateMenuItemInput, MenuListResponse, MenuItemResponse, DeletedMenuListResponse } from "@/types/api"

export const menuKeys = {
  all: ["menuItems"] as const,
  list: () => [...menuKeys.all, "list"] as const,
  deleted: () => [...menuKeys.all, "deleted"] as const,
}

export function useMenuQuery() {
  return useQuery({
    queryKey: menuKeys.list(),
    queryFn: () => api.menuItems.list(),
    staleTime: 5 * 60 * 1000, // 5 minutes - menu data can be cached longer
  })
}

export function useDeletedMenuItems() {
  return useQuery({
    queryKey: menuKeys.deleted(),
    queryFn: () => api.menuItems.listDeleted(),
    staleTime: 30 * 1000, // 30 seconds
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

export function useUpdateMenuItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMenuItemInput }) =>
      api.menuItems.update(id, data),
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

export function useRestoreMenuItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.menuItems.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.all })
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: menuKeys.deleted() })
      const previousData = queryClient.getQueryData<DeletedMenuListResponse>(menuKeys.deleted())

      queryClient.setQueryData<DeletedMenuListResponse>(menuKeys.deleted(), (old) => {
        if (!old) return old
        return { items: old.items.filter((item: MenuItemResponse) => item.id !== id) }
      })

      return { previousData }
    },
    onError: (_err, _id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(menuKeys.deleted(), context.previousData)
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
