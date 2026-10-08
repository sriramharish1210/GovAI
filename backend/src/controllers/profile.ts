import { Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/error';
import { logger } from '../utils/logger';

/**
 * Get Profile & Preferences of current user
 */
export const getProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        notificationPreference: true,
      },
    });

    if (!user) {
      return next(new AppError('User not found', 404, 'NOT_FOUND'));
    }

    res.status(200).json({
      success: true,
      data: {
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        profile: user.profile,
        notificationPreference: user.notificationPreference,
      },
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create or Update profile of current user
 */
export const upsertProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

  const {
    name,
    phone,
    state,
    district,
    educationLevel,
    institution,
    course,
    yearOfStudy,
    academicPercentage,
    familyIncome,
    category,
    gender,
    dob,
    disabilityStatus,
    disabilityPercentage,
    minorityStatus,
  } = req.body;

  try {
    // 1. Update User's display name if provided
    if (typeof name === 'string' && name.trim().length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { name: name.trim() },
      });
    }

    // 2. Build profile update/create fields dynamically
    const profileData: any = {};
    if (phone !== undefined) profileData.phone = phone;
    if (state !== undefined) profileData.state = state;
    if (district !== undefined) profileData.district = district;
    if (educationLevel !== undefined) profileData.educationLevel = educationLevel;
    if (institution !== undefined) profileData.institution = institution;
    if (course !== undefined) profileData.course = course;
    if (yearOfStudy !== undefined) profileData.yearOfStudy = yearOfStudy;
    if (academicPercentage !== undefined) profileData.academicPercentage = academicPercentage;
    if (familyIncome !== undefined) profileData.familyIncome = familyIncome;
    if (category !== undefined) profileData.category = category;
    if (gender !== undefined) profileData.gender = gender;
    if (dob !== undefined) profileData.dob = dob ? new Date(dob) : null;
    if (disabilityStatus !== undefined) profileData.disabilityStatus = disabilityStatus;
    if (disabilityPercentage !== undefined) profileData.disabilityPercentage = disabilityPercentage;
    if (minorityStatus !== undefined) profileData.minorityStatus = minorityStatus;

    // 3. Upsert profile database row
    const profile = await prisma.studentProfile.upsert({
      where: { userId },
      update: profileData,
      create: {
        userId,
        ...profileData,
      },
    });

    logger.info(`Profile updated for user ${userId}`);

    res.status(200).json({
      success: true,
      data: profile,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Notification Preferences of current user
 */
export const updateNotificationPreferences = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

  const {
    emailNotificationsEnabled,
    reminder30Days,
    reminder7Days,
    reminder1Day,
  } = req.body;

  try {
    const preferences = await prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        emailNotificationsEnabled,
        reminder30Days,
        reminder7Days,
        reminder1Day,
      },
      create: {
        userId,
        emailNotificationsEnabled,
        reminder30Days,
        reminder7Days,
        reminder1Day,
      },
    });

    logger.info(`Notification preferences updated for user ${userId}`);

    res.status(200).json({
      success: true,
      data: preferences,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};
