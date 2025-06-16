import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Check for custom Supabase configuration first, then fallback to DATABASE_URL
let connectionString: string;

if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  console.log(`[DB] Detected Supabase credentials, forcing Supabase connection`);
  // Force connection to Supabase custom domain
  connectionString = "postgresql://postgres:98d27237fac179d590315ecc308abd91@supabase.airdata.com.br:5432/postgres";
  console.log(`[DB] Using forced Supabase connection: supabase.airdata.com.br`);
} else if (process.env.DATABASE_URL) {
  connectionString = process.env.DATABASE_URL;
  console.log(`[DB] Using DATABASE_URL connection`);
} else {
  throw new Error(
    "Either SUPABASE_URL and SUPABASE_KEY, or DATABASE_URL must be set.",
  );
}

export const pool = new Pool({ 
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});
export const db = drizzle({ client: pool, schema });