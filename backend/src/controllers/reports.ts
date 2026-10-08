import { Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/error';
import { evaluateSchemeEligibility } from '../services/EligibilityEngine';
import { ReportGenerator } from '../services/ReportGenerator';
import { logger } from '../utils/logger';

/**
 * Generate PDF report of eligible schemes for student
 */
export const generateReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });

    if (!user || !user.profile) {
      return next(new AppError('Student profile must be created before generating a report.', 400, 'PROFILE_REQUIRED'));
    }

    // Fetch schemes
    const schemes = await prisma.scheme.findMany({
      include: { eligibility: true, benefits: true, documents: true }
    });

    // Evaluate schemes and pick eligible & likely eligible ones
    const items = schemes
      .map(scheme => {
        const evaluation = evaluateSchemeEligibility(user.profile as any, scheme as any);
        return { scheme, evaluation };
      })
      .filter(item => item.evaluation.eligibilityStatus !== 'NOT_ELIGIBLE')
      .sort((a, b) => b.evaluation.matchScore - a.evaluation.matchScore);

    // Profile with user info for header
    const profileWithUser = {
      ...user.profile,
      user: { name: user.name, email: user.email }
    };

    // Generate PDF Buffer
    const pdfBuffer = await ReportGenerator.generatePdfReport(profileWithUser as any, items as any);

    // Store report in DB
    await prisma.generatedReport.create({
      data: {
        userId,
        reportData: JSON.stringify({
          generatedAt: new Date().toISOString(),
          totalSchemesCount: items.length,
          topSchemeNames: items.slice(0, 5).map(i => i.scheme.name)
        })
      }
    });

    logger.info(`PDF Report generated for user ${userId} (${items.length} schemes)`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="GovAI_Scheme_Report_${Date.now()}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

/**
 * List generated report history
 */
export const getReportsHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

  try {
    const reports = await prisma.generatedReport.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      data: reports,
      error: null
    });
  } catch (error) {
    next(error);
  }
};
