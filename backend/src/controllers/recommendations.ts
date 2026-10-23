import { Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/error';
import { evaluateSchemeEligibility } from '../services/EligibilityEngine';
import { AIService } from '../services/AIService';
import { logger } from '../utils/logger';

// In-memory cache for recommendation AI explanations: key = `${userId}:${schemeId}:${status}`
const recExplanationCache = new Map<string, string>();

/**
 * Get personalized scheme recommendations for the authenticated user
 */
export const getRecommendations = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const reqStart = Date.now();
  const userId = req.user?.id;
  if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

  const includeExplanation = req.query.explain === 'true';
  const statusFilter = req.query.status as string; // Optional filter: ELIGIBLE, LIKELY_ELIGIBLE, etc.

  try {
    logger.info(`[Stage] getRecommendations received | user: ${userId} | explain: ${includeExplanation}`);

    // 1. Fetch student profile
    const tDb0 = Date.now();
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
    const dbDurationMs = Date.now() - tDb0;

    // 3. Fast deterministic evaluation for all schemes
    const tEval0 = Date.now();
    const evaluatedResults = [];

    for (const scheme of schemes) {
      const evaluation = evaluateSchemeEligibility(profile as any, scheme as any);

      // Filter by requested status if specified
      if (statusFilter && evaluation.eligibilityStatus !== statusFilter) {
        continue;
      }

      evaluatedResults.push({
        scheme,
        matchScore: evaluation.matchScore,
        eligibilityStatus: evaluation.eligibilityStatus,
        rulesEvaluated: evaluation.rulesEvaluated,
        evaluation,
        aiExplanation: ''
      });
    }

    // 4. Sort by status priority (ELIGIBLE > NEEDS_VERIFICATION > NOT_ELIGIBLE), then matchScore descending
    const statusPriority: Record<string, number> = {
      'ELIGIBLE': 3,
      'NEEDS_VERIFICATION': 2,
      'NOT_ELIGIBLE': 1
    };

    evaluatedResults.sort((a, b) => {
      const priorityA = statusPriority[a.eligibilityStatus] || 0;
      const priorityB = statusPriority[b.eligibilityStatus] || 0;
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }
      return b.matchScore - a.matchScore;
    });
    const evalDurationMs = Date.now() - tEval0;

    // 5. Generate AI explanations ONLY for top 3 matching schemes, concurrently with timeout
    const tAi0 = Date.now();
    if (includeExplanation) {
      const topMatches = evaluatedResults
        .filter(r => r.eligibilityStatus !== 'NOT_ELIGIBLE')
        .slice(0, 3);

      logger.info(`[Stage] Generating AI explanations for top ${topMatches.length} schemes concurrently...`);

      await Promise.allSettled(
        topMatches.map(async (item) => {
          const cacheKey = `${userId}:${item.scheme.id}:${item.eligibilityStatus}`;
          if (recExplanationCache.has(cacheKey)) {
            item.aiExplanation = recExplanationCache.get(cacheKey)!;
            return;
          }

          try {
            const explanation = await AIService.recommendationExplanation(
              profile as any,
              item.scheme as any,
              item.evaluation
            );
            item.aiExplanation = explanation;
            recExplanationCache.set(cacheKey, explanation);
          } catch (explainErr) {
            logger.warn(`Failed to generate AI explanation for scheme ${item.scheme.id}: ${explainErr}`);
            item.aiExplanation = ''; // Graceful degradation: retain match without crashing response
          }
        })
      );
    }
    const aiDurationMs = Date.now() - tAi0;

    // Clean up temporary internal evaluation object before returning
    const finalRecommendations = evaluatedResults.map(({ evaluation, ...rest }) => rest);
    const totalDurationMs = Date.now() - reqStart;

    logger.info(`[Stage] getRecommendations completed | user: ${userId} | db: ${dbDurationMs}ms | eval: ${evalDurationMs}ms | ai: ${aiDurationMs}ms | total: ${totalDurationMs}ms | count: ${finalRecommendations.length}`);

    res.status(200).json({
      success: true,
      data: {
        hasProfile: true,
        total: finalRecommendations.length,
        recommendations: finalRecommendations
      },
      error: null
    });
  } catch (error) {
    const totalDurationMs = Date.now() - reqStart;
    logger.error(`[Stage] getRecommendations failed after ${totalDurationMs}ms:`, error);
    next(error);
  }
};
