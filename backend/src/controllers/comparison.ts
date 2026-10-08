import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { AppError } from '../middlewares/error';

/**
 * Compare 2 to 4 schemes side-by-side
 */
export const compareSchemes = async (req: Request, res: Response, next: NextFunction) => {
  const { schemeIds } = req.body;

  try {
    const schemes = await prisma.scheme.findMany({
      where: {
        id: { in: schemeIds }
      },
      include: {
        benefits: true,
        documents: true,
        eligibility: true,
        tags: true
      }
    });

    // Check if we found the requested schemes
    if (schemes.length === 0) {
      return next(new AppError('None of the requested schemes were found.', 404, 'NOT_FOUND'));
    }

    res.status(200).json({
      success: true,
      data: schemes,
      error: null
    });
  } catch (error) {
    next(error);
  }
};
export default compareSchemes;
