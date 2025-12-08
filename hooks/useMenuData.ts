"use client"

import { useCallback, useEffect, useState } from "react"

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
  // 可选的降级回退数据（API 失败时使用）
  fallback?: { items: UIMenuItem[]; categories?: UICategory[] }
}

export function useMenuData(options: UseMenuDataOptions = {}) {
  const { fallback } = options
  const [items, setItems] = useState<UIMenuItem[]>(fallback?.items ?? [])
  const [categories, setCategories] = useState<UICategory[]>(
    fallback?.categories ?? [{ id: "all", name: "全部" }],
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const fallbackItems = fallback?.items
  const fallbackCategories = fallback?.categories

  useEffect(() => {
    let aborted = false
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch("/api/menu-items", { cache: "no-store" })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (aborted) return

        const nextItems: UIMenuItem[] = Array.isArray(data?.items) ? data.items : []
        const nextCategories: UICategory[] = Array.isArray(data?.categories)
          ? data.categories
          : [{ id: "all", name: "全部" }]

        setItems(nextItems)
        setCategories(nextCategories)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "加载失败")
        // 降级回退
        if (fallbackItems?.length) {
          setItems(fallbackItems)
          if (fallbackCategories) setCategories(fallbackCategories)
        }
      } finally {
        if (!aborted) setLoading(false)
      }
    }

    load()
    return () => {
      aborted = true
    }
  }, [fallbackCategories, fallbackItems, reloadKey])

  const refresh = useCallback(() => {
    setReloadKey((key) => key + 1)
  }, [])

  return { items, categories, loading, error, refresh }
}
