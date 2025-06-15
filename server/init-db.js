import bcrypt from 'bcrypt';
import { Pool } from '@neondatabase/serverless';

async function createTestUser() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  const hashedPassword = await bcrypt.hash('123456', 10);
  
  try {
    const result = await pool.query(`
      INSERT INTO users (email, password, name) 
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO NOTHING
      RETURNING id, email, name
    `, ['admin@cabedelo.pb.gov.br', hashedPassword, 'Administrador']);
    
    if (result.rows.length > 0) {
      console.log('Test user created successfully:', result.rows[0]);
    } else {
      console.log('Test user already exists');
    }
  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await pool.end();
  }
}

createTestUser();