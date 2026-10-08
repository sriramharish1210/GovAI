import { Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/error';
import { evaluateSchemeEligibility } from '../services/EligibilityEngine';
import { AIService } from '../services/AIService';
import { logger } from '../utils/logger';

/**
 * Get personalized scheme recommendations for the authenticated user
 */
export const getRecommendations = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

  const includeExplanation = req.query.explain === 'true';
  const statusFilter = req.query.status as string; // Optional filter: ELIGIBLE, LIKELY_ELIGIBLE, etc.

  try {
    // 1. Fetch student profile
    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return res.status(200).json({
        success: true,
        data: {
          hasProfile: false,
          recommendations: [],
          message: 'Please complete your student profile to receive personalized recommendations.'
        },
        error: null
      });
    }

    // 2. Fetch all schemes from DB
    const schemes = await prisma.scheme.findMany({
      include: {
        eligibility: true,
        benefits: true,
        documents: true,
        tags: true,
      }
    });

    // 3. Evaluate eligibility for each scheme
    const recommendationResults = [];

    for (const scheme of schemes) {
      const evaluation = evaluateSchemeEligibility(profile as any, scheme as any);

      // Filter by requested status if specified
      if (statusFilter && evaluation.eligibilityStatus !== statusFilter) {
        continue;
      }

      let aiExplanation = '';
      // Generate AI explanation if explicitly requested or if scheme is top eligible
      if (includeExplanation && evaluation.eligibilityStatus !== 'NOT_ELIGIBLE') {
        aiExplanation = await AIService.recommendationExplanation(
          profile as any,
          scheme as any,
          evaluation
        );
      }

      recommendationResults.push({
        scheme,
        matchScore: evaluation.matchScore,
        eligibilityStatus: evaluation.eligibilityStatus,
        rulesEvaluated: evaluation.rulesEvaluated,
        aiExplanation
      });
    }

    // 4. Sort by status priority (ELIGIBLE > NEEDS_VERIFICATION > NOT_ELIGIBLE), then matchScore descending
    const statusPriority: Record<string, number> = {
      'ELIGIBLE': 3,
      'NEEDS_VERIFICATION': 2,
      'NOT_ELIGIBLE': 1
    };

    recommendationResults.sort((a, b) => {
      const priorityA = statusPriority[a.eligibilityStatus] || 0;
      const priorityB = statusPriority[b.eligibilityStatus] || 0;
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }
      return b.matchScore - a.matchScore;
    });

    logger.info(`Generated ${recommendationResults.length} scheme recommendations for user ${userId}`);

    res.status(200).json({
      success: true,
      data: {
        hasProfile: true,
        total: recommendationResults.length,
        recommendations: recommendationResults
      },
      error: null
    });
  } catch (error) {
    next(error);
  }
};
