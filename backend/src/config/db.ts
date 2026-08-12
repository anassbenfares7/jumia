import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Initialize connection pool using our environment connection string
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Production safeguard: scale up connections if traffic spikes
  max: 20, 
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 2000, // Fail fast if the DB is down
});

// Log successful connections or system pool errors
pool.on('connect', () => {
  console.log('[database]: New client connected to PostgreSQL pool');
});

pool.on('error', (err) => {
  console.error('[database]: Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

// Type-safe query helper function to protect against raw executions
export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};

export default pool;
