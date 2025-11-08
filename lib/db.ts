import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";

declare global {
  // eslint-disable-next-line no-var
  var __drizzle_pool__: Pool | undefined;
}

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Add it to your .env.local file.");
  }

  if (!global.__drizzle_pool__) {
    global.__drizzle_pool__ = new Pool({
      connectionString: process.env.DATABASE_URL,
      // For Supabase, the connection string usually has sslmode=require.
      // If needed, uncomment the next line to force TLS in some environments:
      // ssl: { rejectUnauthorized: false },
    });
  }
  return global.__drizzle_pool__;
}

export function getDb() {
  const pool = getPool();
  return drizzle(pool, { schema });
}
