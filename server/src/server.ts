import { createApp } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

async function main() {
  await connectDB();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`No Distractions API listening on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  // Graceful shutdown: stop accepting new connections, let in-flight
  // requests finish, then close the database connection before exiting.
  // Without this, a container/host restart can kill requests mid-flight
  // or leave the Mongo connection dangling.
  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error: unknown) => {
  logger.error({ error }, 'Failed to start server');
  process.exit(1);
});
