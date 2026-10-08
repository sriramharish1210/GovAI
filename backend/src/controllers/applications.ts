import { Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/error';
import { logger } from '../utils/logger';

/**
 * List all tracked applications of the authenticated user
 */
export const getApplications = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

  try {
    const applications = await prisma.application.findMany({
      where: { userId },
      include: {
        scheme: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      data: applications,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create or Update application tracking status
 */
export const upsertApplication = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const { schemeId, status, notes, appliedAt } = req.body;

  if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

  try {
    // Check if the scheme exists in the database
    const scheme = await prisma.scheme.findUnique({
      where: { id: schemeId }
    });

    if (!scheme) {
      return next(new AppError(`Scheme not found with ID: ${schemeId}`, 404, 'NOT_FOUND'));
    }

    const application = await prisma.application.upsert({
      where: {
        userId_schemeId: { userId, schemeId }
      },
      update: {
        status,
        notes: notes || null,
        appliedAt: appliedAt ? new Date(appliedAt) : null,
      },
      create: {
        userId,
        schemeId,
        status,
        notes: notes || null,
        appliedAt: appliedAt ? new Date(appliedAt) : null,
      }
    });

    logger.info(`Application tracker for scheme ${schemeId} updated to state [${status}] by user ${userId}`);

    res.status(200).json({
      success: true,
      data: application,
      error: null
    });
  } catch (error) {
    next(error);
  }
};
