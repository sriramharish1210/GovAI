import app from './index';
import { config } from './config';
import { prisma } from './utils/db';
import { logger } from './utils/logger';

async function startServer() {
  try {
    // Test Database Connection on startup
    logger.info('Testing database connectivity...');
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connection established successfully.');

    const server = app.listen(config.port, '0.0.0.0', () => {
      logger.info(`GovAI API Server is running on port ${config.port} in [${process.env.NODE_ENV || 'development'}] mode.`);
      logger.info(`AI Mode is set to [${config.aiMode}].`);
    });

    // Handle graceful shutdowns
    const shutdown = async () => {
      logger.info('Shutting down API server gracefully...');
      server.close(async () => {
        logger.info('API server closed.');
        await prisma.$disconnect();
        logger.info('Database connections disconnected.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.critical('CRITICAL STARTUP ERROR: Server failed to start', error);
    process.exit(1);
  }
}

startServer();
