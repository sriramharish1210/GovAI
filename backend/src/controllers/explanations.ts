import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { AppError } from '../middlewares/error';
import { AIService } from '../services/AIService';

/**
 * Explain a government administrative term
 */
export const explainTerm = async (req: Request, res: Response, next: NextFunction) => {
  const { term, context } = req.body;

  if (!term) {
    return next(new AppError('Term parameter is required', 400, 'VALIDATION_ERROR'));
  }

  try {
    const explanation = await AIService.explainTerm(term, context);
    res.status(200).json({
      success: true,
      data: {
        term,
        explanation
      },
      error: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get AI-generated scheme summary
 */
export const summarizeScheme = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const scheme = await prisma.scheme.findUnique({
      where: { id },
      include: { benefits: true, documents: true }
    });

    if (!scheme) {
      return next(new AppError(`Scheme not found with ID: ${id}`, 404, 'NOT_FOUND'));
    }

    const summary = await AIService.summarizeScheme(scheme as any);

    res.status(200).json({
      success: true,
      data: {
        schemeId: scheme.id,
        schemeName: scheme.name,
        summary
      },
      error: null
    });
  } catch (error) {
    next(error);
  }
};
