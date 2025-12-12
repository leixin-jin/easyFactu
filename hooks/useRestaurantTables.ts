"use client"

import { useMemo } from "react"
import { useTables } from "@/lib/queries"

export type TableStatus = "idle" | "occupied"

export interface RestaurantTableView {
  id: string
  number: string
  area?: string | null
  capacity?: number | null
  status: TableStatus
  amount?: number | null
  currentGuests?: number
  startTime?: string
  duration?: string
  orderId?: string
}

interface UseRestaurantTablesFilters {
  search?: string
  status?: TableStatus | "all"
  area?: string | "all"
}

interface UseRestaurantTablesOptions {
  fallback?: RestaurantTableView[]
  filters?: UseRestaurantTablesFilters
}

export function useRestaurantTables(options: UseRestaurantTablesOptions = {}) {
  const { fallback = [], filters } = options

  const { data, isLoading: loading, error: queryError, refetch } = useTables()
  const error = queryError ? (queryError instanceof Error ? queryError.message : "加载失败") : null

  const tables: RestaurantTableView[] = useMemo(() => {
    if (!data) return fallback
    return data.map((r) => ({
      id: String(r.id),
      number: r.number,
      area: r.area ?? null,
      capacity: r.capacity ?? null,
      status: (r.status as TableStatus) ?? "idle",
      amount: typeof r.amount === "number" ? r.amount : r.amount ?? null,
    }))
  }, [data, fallback])

  const reload = async () => {
    await refetch()
  }

  const areas = useMemo(
    () => ["all", ...Array.from(new Set(tables.map((t) => t.area || "").filter(Boolean)))],
    [tables],
  )

  const filteredTables = useMemo(() => {
    const search = (filters?.search ?? "").toLowerCase()
    const status = filters?.status ?? "all"
    const area = filters?.area ?? "all"

    return tables.filter((table) => {
      const matchesSearch =
        !search ||
        table.number.toLowerCase().includes(search) ||
        (table.area ?? "").toLowerCase().includes(search)
      const matchesStatus = status === "all" || table.status === status
      const matchesArea = area === "all" || table.area === area
      return matchesSearch && matchesStatus && matchesArea
    })
  }, [tables, filters?.search, filters?.status, filters?.area])

  const collator = useMemo(
    () => new Intl.Collator(undefined, { numeric: true, sensitivity: "base" }),
    [],
  )

  const sortedTables = useMemo(() => {
    const arr = filteredTables.slice()
    arr.sort(
      (a, b) =>
        collator.compare(a.area || "", b.area || "") ||
        collator.compare(a.number || "", b.number || ""),
    )
    return arr
  }, [filteredTables, collator])

  const groupedTablesByArea = useMemo(() => {
    const groups = new Map<string, RestaurantTableView[]>()
    for (const table of sortedTables) {
      const key = table.area || "未分区"
      const existing = groups.get(key)
      if (existing) {
        existing.push(table)
      } else {
        groups.set(key, [table])
      }
    }
    return Array.from(groups.entries())
  }, [sortedTables])

  return {
    tables,
    loading,
    error,
    reload,
    areas,
    filteredTables,
    sortedTables,
    groupedTablesByArea,
  }
}
