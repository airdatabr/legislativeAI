import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Check for Supabase configuration first, then fallback to DATABASE_URL
let connectionString: string;

if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  // Extract project reference from Supabase URL
  const supabaseUrl = new URL(process.env.SUPABASE_URL);
  const projectRef = supabaseUrl.hostname.split('.')[0];
  
  // Use service_role key for direct database connection
  connectionString = `postgresql://postgres.${projectRef}:${process.env.SUPABASE_KEY}@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require`;
} else if (process.env.DATABASE_URL) {
  connectionString = process.env.DATABASE_URL;
} else {
  throw new Error(
    "Either SUPABASE_URL and SUPABASE_KEY, or DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString });
export const db = drizzle({ client: pool, schema });