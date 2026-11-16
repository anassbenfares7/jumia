import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import pool, { query } from './config/db';
import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import vendorRoutes from './routes/vendorRoutes';
import adminRoutes from './routes/adminRoutes';
import orderRoutes from './routes/orderRoutes';
import reviewRoutes from './routes/reviewRoutes';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mount API Domain Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);

// Health check route
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    await query('SELECT 1');
    res.status(200).json({
      status: 'success',
      message: 'Jumia-Clone Marketplace API is running smoothly',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[health]: Database connectivity check failed.', error);
    res.status(503).json({
      status: 'error',
      message: 'The API is unavailable because its database connection failed.'
    });
  }
});

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
