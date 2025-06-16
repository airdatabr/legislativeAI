import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Force use of Supabase credentials only
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_KEY must be set for database connection.",
  );
}

// Extract project reference from Supabase URL
const supabaseUrl = new URL(process.env.SUPABASE_URL);
const projectRef = supabaseUrl.hostname.split('.')[0];

// Use transaction pooler connection format
const connectionString = `postgresql://postgres.${projectRef}:${process.env.SUPABASE_KEY}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

export const pool = new Pool({ 
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});
export const db = drizzle({ client: pool, schema });