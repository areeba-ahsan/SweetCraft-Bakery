import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Neon (and most hosted Postgres) require SSL. rejectUnauthorized:false
// is fine here since Neon's connection string already pins the host.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/**
 * "Initialize" the pool — pg creates connections lazily, so we just
 * run a quick test query to fail fast if credentials are wrong.
 */
export async function initializePool() {
  try {
    await pool.query('SELECT 1');
    console.log('✅ PostgreSQL (Neon) connection pool ready');
  } catch (err) {
    console.error('❌ Failed to connect to PostgreSQL:', err);
    throw err;
  }
}

export async function closePool() {
  try {
    await pool.end();
    console.log('🛑 PostgreSQL pool closed');
  } catch (err) {
    console.error('Error closing PostgreSQL pool:', err);
  }
}

/**
 * Execute a SQL query. Use $1, $2, ... placeholders in `sql` and
 * pass values in the `params` array, in order — e.g.:
 *   executeQuery('SELECT * FROM users WHERE email = $1', [email])
 */
export async function executeQuery(sql, params = []) {
  try {
    const result = await pool.query(sql, params);
    return result.rows;
  } catch (err) {
    console.error('Database Query Error:', err);
    throw err;
  }
}

export default { initializePool, closePool, executeQuery, pool };