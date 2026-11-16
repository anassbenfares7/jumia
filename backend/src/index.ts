import { env } from './config/env';
import pool, { query } from './config/db';
import app from './app';

const startServer = async (): Promise<void> => {
  try {
    await query('SELECT 1');
  } catch (error) {
    console.error('[startup]: Could not connect to PostgreSQL; the API server was not started.', error);
    await pool.end();
    process.exitCode = 1;
    return;
  }

  const server = app.listen(env.port, () => {
    console.log(`[server]: API is listening on port ${env.port}`);
  });

  server.on('error', (error) => {
    console.error('[server]: Failed to start the API listener.', error);
    process.exitCode = 1;
  });
};

void startServer();
