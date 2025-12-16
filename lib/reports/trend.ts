import { addDays, addHours, addMonths } from "date-fns"

import type { ReportGranularity } from "./types"

export type ReportTrendBucketUnit = "hour" | "day" | "month"

export function getTrendBucketUnit(granularity: ReportGranularity): ReportTrendBucketUnit {
  switch (granularity) {
    case "day":
      return "hour"
    case "week":
    case "month":
      return "day"
    case "year":
      return "month"
  }
}

export function buildTrendBucketStarts(input: {
  startAt: Date
  endAt: Date
  granularity: ReportGranularity
}): Date[] {
  const { startAt, endAt, granularity } = input
  const unit = getTrendBucketUnit(granularity)

  const buckets: Date[] = []
  let cursor = new Date(startAt)

  while (cursor.getTime() < endAt.getTime()) {
    buckets.push(cursor)

    const next =
      unit === "hour"
        ? addHours(cursor, 1)
        : unit === "day"
          ? addDays(cursor, 1)
          : addMonths(cursor, 1)

    if (next.getTime() === cursor.getTime()) break
    cursor = next
  }

  return buckets
}

export function fillTrendSeries(
  buckets: Date[],
  rows: Array<{ bucket: Date; revenue: number }>,
) {
  const revenueByBucket = new Map<number, number>()
  for (const row of rows) {
    const key = row.bucket.getTime()
    revenueByBucket.set(key, row.revenue)
  }

  return buckets.map((bucket) => ({
    bucket: bucket.toISOString(),
    revenue: revenueByBucket.get(bucket.getTime()) ?? 0,
  }))
}

