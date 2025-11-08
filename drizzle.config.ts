import { defineConfig } from "drizzle-kit";
import { config as loadEnv } from "dotenv";

// Load environment variables from .env.local first (Next.js convention),
// then fall back to .env if present.
loadEnv({ path: ".env.local" });
loadEnv();

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
