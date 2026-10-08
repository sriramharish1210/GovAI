import { Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/error';
import { ReminderProcessor } from '../services/ReminderProcessor';
import { logger } from '../utils/logger';

/**
 * List all reminders for the authenticated user
 */
export const getReminders = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

  try {
    const reminders = await prisma.reminder.findMany({
      where: { userId },
      include: {
        scheme: true
      },
      orderBy: { triggerDate: 'asc' }
    });

    res.status(200).json({
      success: true,
      data: reminders,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new deadline reminder for a scheme
 */
export const createReminder = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const { schemeId, daysBefore = 7 } = req.body;

  if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
  if (!schemeId) return next(new AppError('Scheme ID is required', 400, 'VALIDATION_ERROR'));

  const validDays = [30, 7, 1];
  if (!validDays.includes(Number(daysBefore))) {
    return next(new AppError('daysBefore must be 30, 7, or 1', 400, 'VALIDATION_ERROR'));
  }

  try {
    const scheme = await prisma.scheme.findUnique({
      where: { id: schemeId }
    });

    if (!scheme) {
      return next(new AppError(`Scheme not found with ID: ${schemeId}`, 404, 'NOT_FOUND'));
    }

    // Calculate trigger date based on scheme deadline or current date fallback
    let deadlineDate = scheme.deadline ? new Date(scheme.deadline) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const triggerDate = new Date(deadlineDate.getTime() - Number(daysBefore) * 24 * 60 * 60 * 1000);

    const reminder = await prisma.reminder.upsert({
      where: {
        userId_schemeId_daysBefore: {
          userId,
          schemeId,
          daysBefore: Number(daysBefore)
        }
      },
      update: {
        triggerDate,
        isSent: false,
        sentAt: null
      },
      create: {
        userId,
        schemeId,
        daysBefore: Number(daysBefore),
        triggerDate,
        isSent: false
      },
      include: { scheme: true }
    });

    logger.info(`Reminder created for scheme ${schemeId} (${daysBefore} days before) by user ${userId}`);

    res.status(201).json({
      success: true,
      data: reminder,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a reminder
 */
export const deleteReminder = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

  try {
    await prisma.reminder.deleteMany({
      where: { id, userId }
    });

    logger.info(`Reminder ${id} deleted by user ${userId}`);

    res.status(200).json({
      success: true,
      data: { message: 'Reminder deleted successfully' },
      error: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Trigger manual execution of ReminderProcessor
 */
export const triggerReminderProcess = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await ReminderProcessor.processPendingReminders();
    res.status(200).json({
      success: true,
      data: {
        message: 'Reminder processor executed successfully',
        summary: result
      },
      error: null
    });
  } catch (error) {
    next(error);
  }
};
