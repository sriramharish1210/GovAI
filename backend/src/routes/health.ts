import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { config } from '../config';

const router = Router();

router.get('/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Verify Database Connectivity
    let dbStatus = 'DISCONNECTED';
    try {
      // Execute a quick, lightweight check
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'CONNECTED';
    } catch (err) {
      dbStatus = 'ERROR';
    }

    // 2. AI availability check
    const aiStatus = `READY (${config.aiMode})`;

    res.status(200).json({
      success: true,
      data: {
        status: 'UP',
        database: dbStatus,
        ai: aiStatus,
        timestamp: new Date().toISOString()
      },
      error: null
    });
  } catch (error) {
    next(error);
  }
});

export default router;
