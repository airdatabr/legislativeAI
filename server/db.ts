import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Check for custom Supabase configuration first, then fallback to DATABASE_URL
let connectionString: string;

// Check if we have Supabase credentials to override default DATABASE_URL
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  console.log(`[DB] Using Supabase credentials`);
  
  // Extract project reference from SUPABASE_URL
  const supabaseUrl = process.env.SUPABASE_URL;
  console.log(`[DB] Supabase URL: ${supabaseUrl}`);
  
  // For custom domains, we need the actual project reference
  // Please provide the complete DATABASE_URL from Supabase dashboard
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase')) {
    connectionString = process.env.DATABASE_URL;
    console.log(`[DB] Using Supabase DATABASE_URL`);
  } else {
    // Fallback to default DATABASE_URL
    connectionString = process.env.DATABASE_URL || '';
    console.log(`[DB] Using fallback DATABASE_URL`);
  }
} else if (process.env.DATABASE_URL) {
  connectionString = process.env.DATABASE_URL;
  console.log(`[DB] Using standard DATABASE_URL connection`);
} else {
  throw new Error("DATABASE_URL must be set");
}

export const pool = new Pool({ 
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});
export const db = drizzle({ client: pool, schema });