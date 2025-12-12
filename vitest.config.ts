import react from "@vitejs/plugin-react"
import path from "path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/__tests__/**/*.test.{ts,tsx}", "**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "dist"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["lib/**/*.ts", "hooks/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        "**/__tests__/**",
        "**/types/**",
        "**/mocks/**",
        "lib/supabase/**",
        "lib/db.ts",
      ],
      thresholds: {
        "lib/money.ts": { lines: 80, functions: 80, branches: 80, statements: 80 },
        "lib/order-utils.ts": { lines: 80, functions: 80, branches: 80, statements: 80 },
        "lib/checkout/calculate.ts": { lines: 80, functions: 80, branches: 80, statements: 80 },
        "hooks/useCheckout.ts": { lines: 60, functions: 60, branches: 50, statements: 60 },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
})
