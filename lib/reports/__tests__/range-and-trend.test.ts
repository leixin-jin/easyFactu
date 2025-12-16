import { describe, it, expect } from "vitest"
import { addDays, addHours, addMonths } from "date-fns"

import { getReportRange } from "../time"
import { buildTrendBucketStarts, fillTrendSeries } from "../trend"

describe("getReportRange", () => {
  it("calculates day range [startOfToday, startOfTomorrow)", () => {
    const now = new Date(2025, 11, 16, 13, 45, 0)
    const { startAt, endAt } = getReportRange("day", now)

    expect(startAt.getTime()).toBe(new Date(2025, 11, 16, 0, 0, 0, 0).getTime())
    expect(endAt.getTime()).toBe(new Date(2025, 11, 17, 0, 0, 0, 0).getTime())
  })

  it("calculates week range [startOfWeek, startOfNextWeek)", () => {
    const now = new Date(2025, 11, 16, 13, 45, 0) // Tue
    const { startAt, endAt } = getReportRange("week", now, { weekStartsOn: 1 })

    expect(startAt.getTime()).toBe(new Date(2025, 11, 15, 0, 0, 0, 0).getTime()) // Mon
    expect(endAt.getTime()).toBe(new Date(2025, 11, 22, 0, 0, 0, 0).getTime())
  })

  it("calculates month range [startOfMonth, startOfNextMonth)", () => {
    const now = new Date(2025, 11, 16, 13, 45, 0)
    const { startAt, endAt } = getReportRange("month", now)

    expect(startAt.getTime()).toBe(new Date(2025, 11, 1, 0, 0, 0, 0).getTime())
    expect(endAt.getTime()).toBe(new Date(2026, 0, 1, 0, 0, 0, 0).getTime())
  })

  it("calculates year range [startOfYear, startOfNextYear)", () => {
    const now = new Date(2025, 11, 16, 13, 45, 0)
    const { startAt, endAt } = getReportRange("year", now)

    expect(startAt.getTime()).toBe(new Date(2025, 0, 1, 0, 0, 0, 0).getTime())
    expect(endAt.getTime()).toBe(new Date(2026, 0, 1, 0, 0, 0, 0).getTime())
  })
})

describe("buildTrendBucketStarts", () => {
  it("builds 24 hourly buckets for day granularity", () => {
    const now = new Date(2025, 11, 16, 13, 45, 0)
    const { startAt, endAt } = getReportRange("day", now)
    const buckets = buildTrendBucketStarts({ startAt, endAt, granularity: "day" })

    expect(buckets).toHaveLength(24)
    expect(buckets[0].getTime()).toBe(startAt.getTime())
    expect(buckets[buckets.length - 1].getTime()).toBe(addHours(startAt, 23).getTime())
    expect(buckets.every((b) => b.getTime() >= startAt.getTime() && b.getTime() < endAt.getTime())).toBe(true)
  })

  it("builds 7 daily buckets for week granularity", () => {
    const now = new Date(2025, 11, 16, 13, 45, 0)
    const { startAt, endAt } = getReportRange("week", now, { weekStartsOn: 1 })
    const buckets = buildTrendBucketStarts({ startAt, endAt, granularity: "week" })

    expect(buckets).toHaveLength(7)
    expect(buckets[0].getTime()).toBe(startAt.getTime())
    expect(buckets[buckets.length - 1].getTime()).toBe(addDays(startAt, 6).getTime())
    expect(buckets.every((b) => b.getTime() >= startAt.getTime() && b.getTime() < endAt.getTime())).toBe(true)
  })

  it("builds 31 daily buckets for December month granularity", () => {
    const now = new Date(2025, 11, 16, 13, 45, 0)
    const { startAt, endAt } = getReportRange("month", now)
    const buckets = buildTrendBucketStarts({ startAt, endAt, granularity: "month" })

    expect(buckets).toHaveLength(31)
    expect(buckets[0].getTime()).toBe(startAt.getTime())
    expect(buckets[buckets.length - 1].getTime()).toBe(addDays(startAt, 30).getTime())
    expect(buckets.every((b) => b.getTime() >= startAt.getTime() && b.getTime() < endAt.getTime())).toBe(true)
  })

  it("builds 12 monthly buckets for year granularity", () => {
    const now = new Date(2025, 11, 16, 13, 45, 0)
    const { startAt, endAt } = getReportRange("year", now)
    const buckets = buildTrendBucketStarts({ startAt, endAt, granularity: "year" })

    expect(buckets).toHaveLength(12)
    expect(buckets[0].getTime()).toBe(startAt.getTime())
    expect(buckets[buckets.length - 1].getTime()).toBe(addMonths(startAt, 11).getTime())
    expect(buckets.every((b) => b.getTime() >= startAt.getTime() && b.getTime() < endAt.getTime())).toBe(true)
  })
})

describe("fillTrendSeries", () => {
  it("fills missing buckets with 0 and keeps [startAt, endAt) boundaries", () => {
    const startAt = new Date(2025, 11, 16, 0, 0, 0, 0)
    const buckets = [startAt, addHours(startAt, 1), addHours(startAt, 2)]

    const rows = [{ bucket: addHours(startAt, 1), revenue: 12.5 }]
    const series = fillTrendSeries(buckets, rows)

    expect(series).toEqual([
      { bucket: buckets[0].toISOString(), revenue: 0 },
      { bucket: buckets[1].toISOString(), revenue: 12.5 },
      { bucket: buckets[2].toISOString(), revenue: 0 },
    ])
  })
})

