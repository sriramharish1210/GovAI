import { Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/error';
import { logger } from '../utils/logger';

/**
 * List all saved bookmarks of the authenticated user
 */
export const getBookmarks = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

  try {
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId },
      include: {
        scheme: {
          include: {
            eligibility: true,
            benefits: true,
            documents: true,
            tags: true,
          }
        }
      }
    });

    // Extract schemes
    const schemes = bookmarks.map((b: any) => b.scheme);

    res.status(200).json({
      success: true,
      data: schemes,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bookmark a government scheme
 */
export const addBookmark = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const { schemeId } = req.body;

  if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
  if (!schemeId) return next(new AppError('Scheme ID is required', 400, 'VALIDATION_ERROR'));

  try {
    // Verify scheme exists in database
    const scheme = await prisma.scheme.findUnique({
      where: { id: schemeId }
    });

    if (!scheme) {
      return next(new AppError(`Scheme not found with ID: ${schemeId}`, 404, 'NOT_FOUND'));
    }

    const bookmark = await prisma.bookmark.upsert({
      where: {
        userId_schemeId: { userId, schemeId }
      },
      update: {},
      create: {
        userId,
        schemeId
      }
    });

    logger.info(`Scheme ${schemeId} bookmarked by user ${userId}`);

    res.status(201).json({
      success: true,
      data: bookmark,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove a government scheme bookmark
 */
export const removeBookmark = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const { schemeId } = req.params;

  if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

  try {
    await prisma.bookmark.delete({
      where: {
        userId_schemeId: { userId, schemeId }
      }
    });

    logger.info(`Bookmark for scheme ${schemeId} removed by user ${userId}`);

    res.status(200).json({
      success: true,
      data: { message: 'Bookmark removed successfully' },
      error: null
    });
  } catch (error) {
    // If bookmark does not exist, return success to maintain idempotency
    res.status(200).json({
      success: true,
      data: { message: 'Bookmark removed successfully' },
      error: null
    });
  }
};
