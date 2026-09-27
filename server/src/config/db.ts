import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

/**
 * Opens the Mongoose/MongoDB connection. Called once from server.ts before
 * the HTTP server starts listening — deliberately NOT called from app.ts,
 * so the Express app can be imported and exercised with Supertest in tests
 * without needing a real database.
 */
export async function connectDB(): Promise<void> {
  mongoose.connection.on('error', (error) => {
    logger.error({ error }, 'MongoDB connection error');
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  await mongoose.connect(env.MONGODB_URI);
  logger.info({ db: mongoose.connection.name }, 'MongoDB connected');
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
