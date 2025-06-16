// build.js
import { build } from 'esbuild';
import { execSync } from 'child_process';

// Primeiro, build do Vite
console.log('Building client with Vite...');
execSync('vite build', { stdio: 'inherit' });

// Depois, build do servidor
console.log('Building server...');
await build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outdir: 'dist',
  external: [
    // Apenas pacotes que realmente devem ser externos
    'express',
    'drizzle-orm',
    '@supabase/supabase-js',
    'dotenv',
    'openai',
    // Adicione outros pacotes de node_modules que você usa
  ],
  // Não incluir 'vite' como external
});

console.log('Build complete!');