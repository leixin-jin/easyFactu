export * from "./tables"
export * from "./transactions"

export const useMockData = process.env.NODE_ENV === "development" && !process.env.DATABASE_URL
