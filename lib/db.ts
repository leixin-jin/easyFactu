import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";
import { getServerEnv } from "@/lib/env";

declare global {
  var __drizzle_pool__: Pool | undefined;
}

function getPool() {
  if (!global.__drizzle_pool__) {
    const serverEnv = getServerEnv();
    global.__drizzle_pool__ = new Pool({
      connectionString: serverEnv.DATABASE_URL,
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
