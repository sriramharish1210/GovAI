import { Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/error';
import { RuleGroup, RuleCondition, Scheme } from '../../../shared/types';
import { evaluateSchemeEligibility } from '../services/EligibilityEngine';

/**
 * Recursively find all conditions for a specific field in a RuleGroup
 */
function findConditionsOnField(group: RuleGroup, field: string): RuleCondition[] {
  const conds: RuleCondition[] = [];
  if (group.conditions) {
    conds.push(...group.conditions.filter(c => c.field === field));
  }
  if (group.groups) {
    for (const child of group.groups) {
      conds.push(...findConditionsOnField(child, field));
    }
  }
  return conds;
}

/**
 * Check if a specific value is allowed by the conditions on a field
 */
function isValueAllowed(rulesJsonStr: string | null | undefined, field: string, valueToCheck: any): boolean {
  if (!rulesJsonStr) return true;
  try {
    const group: RuleGroup = JSON.parse(rulesJsonStr);
    const conditions = findConditionsOnField(group, field);
    
    if (conditions.length === 0) return true;

    for (const cond of conditions) {
      const { operator, value } = cond;
      
      if (field === 'familyIncome') {
        const incomeVal = parseFloat(valueToCheck);
        if (isNaN(incomeVal)) continue;
        if (operator === 'LTE' && incomeVal > value) return false;
        if (operator === 'LT' && incomeVal >= value) return false;
      }
      
      if (field === 'category') {
        const catStr = String(valueToCheck).toLowerCase();
        if (operator === 'EQ' && String(value).toLowerCase() !== catStr) return false;
        if (operator === 'IN' && Array.isArray(value) && !value.map(v => String(v).toLowerCase()).includes(catStr)) return false;
      }

      if (field === 'educationLevel') {
        const eduStr = String(valueToCheck).toLowerCase();
        if (operator === 'EQ' && String(value).toLowerCase() !== eduStr) return false;
        if (operator === 'IN' && Array.isArray(value) && !value.map(v => String(v).toLowerCase()).includes(eduStr)) return false;
      }
    }
    return true;
  } catch (e) {
    return true; // If JSON error, don't fail the filter
  }
}

/**
 * Get Paginated Schemes List with Searching and Filtering
 */
export const getSchemes = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const {
    page = 1,
    limit = 10,
    search,
    centralOrState,
    state,
    category,
    educationLevel,
    maxIncome,
    categoryFilter,
    sortBy = 'alpha'
  } = req.query as any;

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;

  try {
    // 1. Build Prisma query conditions
    const whereClause: any = {};

    if (centralOrState) {
      whereClause.centralOrState = centralOrState;
    }

    if (state) {
      whereClause.state = { equals: state };
    }

    const catToFilter = categoryFilter || category;

    if (search) {
      const searchStr = String(search);
      whereClause.OR = [
        { name: { contains: searchStr } },
        { shortDescription: { contains: searchStr } },
        { department: { contains: searchStr } },
        { tags: { some: { name: { contains: searchStr } } } }
      ];
    }

    // Fetch schemes from DB
    const schemes = await prisma.scheme.findMany({
      where: whereClause,
      include: {
        eligibility: true,
        benefits: true,
        documents: true,
        tags: true,
      }
    });

    // 2. Perform in-memory filtering for nested rules (Income, Category, EducationLevel)
    let filteredSchemes: any[] = schemes;

    if (maxIncome !== undefined) {
      filteredSchemes = filteredSchemes.filter((s: any) => 
        isValueAllowed(s.eligibility?.rulesJson, 'familyIncome', maxIncome)
      );
    }

    if (catToFilter) {
      filteredSchemes = filteredSchemes.filter((s: any) => 
        isValueAllowed(s.eligibility?.rulesJson, 'category', catToFilter)
      );
    }

    if (educationLevel) {
      filteredSchemes = filteredSchemes.filter((s: any) => 
        isValueAllowed(s.eligibility?.rulesJson, 'educationLevel', educationLevel)
      );
    }

    // 3. Sorting logic
    if (sortBy === 'alpha') {
      filteredSchemes.sort((a: any, b: any) => a.name.localeCompare(b.name));
    } else if (sortBy === 'verified') {
      filteredSchemes.sort((a: any, b: any) => b.lastVerifiedDate.getTime() - a.lastVerifiedDate.getTime());
    } else if (sortBy === 'deadline') {
      filteredSchemes.sort((a: any, b: any) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.getTime() - b.deadline.getTime();
      });
    } else if (sortBy === 'relevance' && req.user?.id) {
      // Fetch user profile to calculate match score relevance
      const userProfile = await prisma.studentProfile.findUnique({
        where: { userId: req.user.id }
      });
      if (userProfile) {
        const statusPriority: Record<string, number> = {
          'ELIGIBLE': 3,
          'NEEDS_VERIFICATION': 2,
          'NOT_ELIGIBLE': 1
        };
        const scoredSchemes = filteredSchemes.map((s: any) => {
          const evalRes = evaluateSchemeEligibility(userProfile as any, s as any);
          return { scheme: s, score: evalRes.matchScore, status: evalRes.eligibilityStatus };
        });
        scoredSchemes.sort((a: any, b: any) => {
          const prioA = statusPriority[a.status] || 0;
          const prioB = statusPriority[b.status] || 0;
          if (prioA !== prioB) return prioB - prioA;
          return b.score - a.score;
        });
        filteredSchemes = scoredSchemes.map((x: any) => x.scheme);
      } else {
        filteredSchemes.sort((a: any, b: any) => a.name.localeCompare(b.name));
      }
    }

    // 4. Pagination
    const total = filteredSchemes.length;
    const totalPages = Math.ceil(total / limitNum);
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedSchemes = filteredSchemes.slice(startIndex, startIndex + limitNum);

    res.status(200).json({
      success: true,
      data: {
        schemes: paginatedSchemes,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages
        }
      },
      error: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Scheme Details by ID
 */
export const getSchemeById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const scheme = await prisma.scheme.findUnique({
      where: { id },
      include: {
        eligibility: true,
        benefits: true,
        documents: true,
        tags: true
      }
    });

    if (!scheme) {
      return next(new AppError(`Scheme not found with ID: ${id}`, 404, 'NOT_FOUND'));
    }

    res.status(200).json({
      success: true,
      data: scheme,
      error: null
    });
  } catch (error) {
    next(error);
  }
};
