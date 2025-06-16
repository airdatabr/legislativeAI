import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Check for custom Supabase configuration first, then fallback to DATABASE_URL
let connectionString: string;

if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  // Handle custom Supabase domain
  if (process.env.SUPABASE_URL.includes('airdata.com.br')) {
    // Custom domain - extract project reference from SUPABASE_KEY or use direct connection
    console.log(`[DB] Using custom Supabase domain: airdata.com.br`);
    // For custom domains, we typically need the direct DATABASE_URL
    if (process.env.DATABASE_URL) {
      connectionString = process.env.DATABASE_URL;
    } else {
      throw new Error("DATABASE_URL required for custom Supabase domain");
    }
  } else {
    // Standard Supabase domain
    const supabaseUrl = new URL(process.env.SUPABASE_URL);
    const projectRef = supabaseUrl.hostname.split('.')[0];
    connectionString = `postgresql://postgres.${projectRef}:${process.env.SUPABASE_KEY}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;
    console.log(`[DB] Connecting to Supabase project: ${projectRef}`);
  }
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