import oracledb from 'oracledb';
import dotenv from 'dotenv';

dotenv.config();

// ------------------------------------------------------------------
// Oracle 11g does NOT support node-oracledb's default "Thin" mode
// (Thin mode only works with Oracle Database 12.1+). So we switch
// to "Thick" mode, which talks to the DB via Oracle Instant Client
// and works with older databases like 11g.
//
// Set ORACLE_CLIENT_LIB_DIR in your .env to the folder where you
// extracted Oracle Instant Client, e.g.:
//   ORACLE_CLIENT_LIB_DIR=C:\oracle\instantclient_21_13
// ------------------------------------------------------------------
if (process.env.ORACLE_CLIENT_LIB_DIR) {
  oracledb.initOracleClient({ libDir: process.env.ORACLE_CLIENT_LIB_DIR });
  console.log('🔧 Oracle Thick mode enabled using:', process.env.ORACLE_CLIENT_LIB_DIR);
}

// Standardize output format to JavaScript Objects (key: value)
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

/**
 * Initialize the Connection Pool on application startup
 */
export async function initializePool() {
  try {
    await oracledb.createPool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING,
      poolMin: 2,
      poolMax: 10,
      poolIncrement: 1
    });
    console.log('✅ Oracle DB Connection Pool initialized');
  } catch (err) {
    console.error('❌ Failed to initialize Oracle DB Pool:', err);
    throw err;
  }
}

/**
 * Close the connection pool gracefully on application shutdown
 */
export async function closePool() {
  try {
    await oracledb.getPool().close(10); // Wait up to 10s for active queries to complete
    console.log('🛑 Oracle DB Pool closed');
  } catch (err) {
    console.error('Error closing Oracle DB Pool:', err);
  }
}

/**
 * Execute SQL Query using pooled connection
 */
export async function executeQuery(sql, params = [], options = {}) {
  let connection;
  try {
    // Borrow connection from pool
    connection = await oracledb.getConnection();

    // AutoCommit defaults to true, but can be overridden in options
    const queryOptions = { autoCommit: true, ...options };
    const result = await connection.execute(sql, params, queryOptions);

    // Return rows for SELECT queries, or metadata for INSERT/UPDATE/DELETE
    return result.rows || result;
  } catch (err) {
    console.error('Database Query Error:', err);
    throw err;
  } finally {
    if (connection) {
      try {
        // Releases connection BACK TO THE POOL (doesn't destroy network link)
        await connection.close();
      } catch (closeErr) {
        console.error('Error releasing database connection back to pool:', closeErr);
      }
    }
  }
}

export default { initializePool, closePool, executeQuery };