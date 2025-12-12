"use client"

import { useCallback, useMemo } from "react"
import { useMenuItems } from "@/lib/queries"

export interface UIMenuItem {
  id: string
  name: string
  nameEn: string
  category: string
  price: number
  image: string | null
  available: boolean
  description?: string | null
}

export interface UICategory {
  id: string
  name: string
  count?: number
}

interface UseMenuDataOptions {
  fallback?: { items: UIMenuItem[]; categories?: UICategory[] }
}

export function useMenuData(options: UseMenuDataOptions = {}) {
  const { fallback } = options

  const { data, isLoading: loading, error: queryError, refetch } = useMenuItems()
  const error = queryError ? (queryError instanceof Error ? queryError.message : "加载失败") : null

  const items: UIMenuItem[] = useMemo(() => {
    if (!data?.items) return fallback?.items ?? []
    return data.items
  }, [data, fallback])

  const categories: UICategory[] = useMemo(() => {
    if (!data?.categories) return fallback?.categories ?? [{ id: "all", name: "全部" }]
    return data.categories
  }, [data, fallback])

  const refresh = useCallback(() => {
    refetch()
  }, [refetch])

  return { items, categories, loading, error, refresh }
}
