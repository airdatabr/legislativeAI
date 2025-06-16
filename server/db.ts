import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Use direct Supabase connection string from environment
if (!process.env.SUPABASE_CONNECTION_STRING) {
  throw new Error("SUPABASE_CONNECTION_STRING must be set. Get this from your Supabase dashboard > Settings > Database > Connection string > Transaction pooler");
}

const connectionString = process.env.SUPABASE_CONNECTION_STRING;
console.log(`[DB] Connecting to Supabase PostgreSQL database`);

export const pool = new Pool({ 
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});
export const db = drizzle({ client: pool, schema });