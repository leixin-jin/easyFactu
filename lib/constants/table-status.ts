export const TableStatus = {
  IDLE: "idle",
  OCCUPIED: "occupied",
} as const

export type TableStatus = (typeof TableStatus)[keyof typeof TableStatus]

export const tableStatusConfig: Record<
  TableStatus,
  { label: string; color: string; textColor: string; bgColor: string }
> = {
  idle: {
    label: "空闲",
    color: "bg-primary",
    textColor: "text-primary",
    bgColor: "bg-primary/10",
  },
  occupied: {
    label: "就餐中",
    color: "bg-destructive",
    textColor: "text-destructive",
    bgColor: "bg-destructive/10",
  },
}
