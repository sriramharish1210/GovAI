import { z } from 'zod';

export const profileSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    phone: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    district: z.string().nullable().optional(),
    educationLevel: z.string().nullable().optional(),
    institution: z.string().nullable().optional(),
    course: z.string().nullable().optional(),
    yearOfStudy: z.number().int().min(1).nullable().optional(),
    academicPercentage: z.number().min(0).max(100).nullable().optional(),
    familyIncome: z.number().nonnegative().nullable().optional(),
    category: z.string().nullable().optional(),
    gender: z.string().nullable().optional(),
    dob: z.string().nullable().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Invalid date of birth format. Must be an ISO date string (YYYY-MM-DD)',
    }),
    disabilityStatus: z.boolean().optional(),
    disabilityPercentage: z.number().min(0).max(100).nullable().optional(),
    minorityStatus: z.boolean().optional(),
  })
});

export const renameChatSessionSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1, 'Title cannot be empty').max(200, 'Title is too long')
  })
});

export const notificationPreferenceSchema = z.object({
  body: z.object({
    emailNotificationsEnabled: z.boolean(),
    reminder30Days: z.boolean(),
    reminder7Days: z.boolean(),
    reminder1Day: z.boolean(),
  })
});

export const schemeQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().transform(v => v ? parseInt(v, 10) : 1),
    limit: z.string().optional().transform(v => v ? parseInt(v, 10) : 10),
    search: z.string().optional(),
    centralOrState: z.enum(['CENTRAL', 'STATE']).optional(),
    state: z.string().optional(),
    category: z.string().optional(),
    educationLevel: z.string().optional(),
    maxIncome: z.string().optional().transform(v => v ? parseFloat(v) : undefined),
    categoryFilter: z.string().optional(), // OBC, SC, ST etc.
    sortBy: z.enum(['relevance', 'deadline', 'verified', 'alpha']).optional().default('alpha'),
  })
});

export const chatbotMessageSchema = z.object({
  body: z.object({
    message: z.string().min(1, 'Message content cannot be empty'),
  })
});

export const comparisonSchema = z.object({
  body: z.object({
    schemeIds: z.array(z.string()).min(1).max(4, 'Can compare between 1 and 4 schemes'),
  })
});

export const applicationSchema = z.object({
  body: z.object({
    schemeId: z.string().min(1, 'Scheme ID is required'),
    status: z.enum(['NOT_APPLIED', 'PLANNING_TO_APPLY', 'APPLIED', 'COMPLETED']),
    notes: z.string().nullable().optional(),
    appliedAt: z.string().nullable().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Invalid appliedAt date format',
    }),
  })
});

export const reminderSchema = z.object({
  body: z.object({
    schemeId: z.string().min(1, 'Scheme ID is required'),
    daysBefore: z.union([z.literal(30), z.literal(7), z.literal(1)]),
  })
});

export const explanationQuerySchema = z.object({
  body: z.object({
    term: z.string().min(1, 'Term is required'),
    context: z.string().optional(),
  })
});
