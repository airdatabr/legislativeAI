import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Use DATABASE_URL for now until Supabase URL is properly configured
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Configure with your Supabase connection string.",
  );
}

const connectionString = process.env.DATABASE_URL;
console.log(`[DB] Using configured DATABASE_URL connection`);

export const pool = new Pool({ 
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});
export const db = drizzle({ client: pool, schema });