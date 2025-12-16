import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns"

import type { ReportGranularity } from "./types"

export const DEFAULT_WEEK_STARTS_ON = 1 as const

export function getReportRange(
  granularity: ReportGranularity,
  now: Date = new Date(),
  options: { weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 } = {},
) {
  const weekStartsOn = options.weekStartsOn ?? DEFAULT_WEEK_STARTS_ON

  switch (granularity) {
    case "day": {
      const startAt = startOfDay(now)
      const endAt = addDays(startAt, 1)
      return { startAt, endAt }
    }
    case "week": {
      const startAt = startOfWeek(now, { weekStartsOn })
      const endAt = addWeeks(startAt, 1)
      return { startAt, endAt }
    }
    case "month": {
      const startAt = startOfMonth(now)
      const endAt = addMonths(startAt, 1)
      return { startAt, endAt }
    }
    case "year": {
      const startAt = startOfYear(now)
      const endAt = addYears(startAt, 1)
      return { startAt, endAt }
    }
  }
}

