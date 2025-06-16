// Script to configure environment variables for deployment
// This overrides any legacy PostgreSQL variables with Supabase configuration

const requiredEnvVars = {
  'SUPABASE_URL': process.env.SUPABASE_URL,
  'SUPABASE_KEY': process.env.SUPABASE_KEY,
  'OPENAI_API_KEY': process.env.OPENAI_API_KEY,
  'JWT_SECRET': process.env.JWT_SECRET,
  'INTERNAL_LAWS_API_URL': process.env.INTERNAL_LAWS_API_URL,
  'INTERNAL_LAWS_API_KEY': process.env.INTERNAL_LAWS_API_KEY
};

// Remove deprecated PostgreSQL variables
const deprecatedVars = ['DATABASE_URL', 'PGDATABASE', 'PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD'];
deprecatedVars.forEach(varName => {
  delete process.env[varName];
});

// Verify required variables
const missing = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missing.length > 0) {
  console.error('Missing required environment variables:', missing);
  process.exit(1);
}

console.log('Environment configured for Supabase deployment');
console.log('Required variables:', Object.keys(requiredEnvVars));