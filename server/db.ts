import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Check for Supabase configuration first, then fallback to DATABASE_URL
let connectionString: string;

if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  // Construct Supabase connection string
  const supabaseUrl = new URL(process.env.SUPABASE_URL);
  const host = supabaseUrl.hostname;
  const projectRef = host.split('.')[0];
  
  connectionString = `postgresql://postgres.${projectRef}:${process.env.SUPABASE_KEY}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;
} else if (process.env.DATABASE_URL) {
  connectionString = process.env.DATABASE_URL;
} else {
  throw new Error(
    "Either SUPABASE_URL and SUPABASE_KEY, or DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString });
export const db = drizzle({ client: pool, schema });