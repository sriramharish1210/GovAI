import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { AppError } from '../middlewares/error';
import { AIService } from '../services/AIService';
import { GlossaryService } from '../services/GlossaryService';
import { logger } from '../utils/logger';

/**
 * Explain a government administrative term
 */
export const explainTerm = async (req: Request, res: Response, next: NextFunction) => {
  const reqStart = Date.now();
  const { term, context } = req.body;

  if (!term) {
    return next(new AppError('Term parameter is required', 400, 'VALIDATION_ERROR'));
  }

  try {
    logger.info(`[Stage] explainTerm received for "${term}"`);
    const { explanation, source, durationMs } = await GlossaryService.getExplanation(term, context);
    const totalMs = Date.now() - reqStart;
    logger.info(`[Stage] explainTerm completed for "${term}" | source: ${source} | lookup/gen: ${durationMs}ms | total: ${totalMs}ms`);

    res.status(200).json({
      success: true,
      data: {
        term,
        explanation
      },
      error: null
    });
  } catch (error) {
    const totalMs = Date.now() - reqStart;
    logger.error(`[Stage] explainTerm failed for "${term}" after ${totalMs}ms:`, error);
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
