import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../utils/db';
import { config } from '../config';
import { AppError } from '../middlewares/error';
import { logger } from '../utils/logger';

const googleClient = config.googleClientId ? new OAuth2Client(config.googleClientId) : null;

// Helper to sign JWT
const signToken = (userId: string): string => {
  return jwt.sign({ userId }, config.authSecret, { expiresIn: '7d' });
};

// Helper to set cookie
const setAuthCookie = (res: Response, token: string) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

/**
 * Handle Google Authentication
 */
export const googleAuth = async (req: Request, res: Response, next: NextFunction) => {
  const { idToken } = req.body;

  if (!idToken) {
    return next(new AppError('Google ID Token is required', 400, 'VALIDATION_ERROR'));
  }

  try {
    let email = '';
    let name = '';
    let avatarUrl = '';

    // Handle token verification
    if (process.env.NODE_ENV !== 'production' && idToken === 'mock-google-token') {
      // Allow a mock bypass in development if token is set to mock
      email = 'dev.google.student@govai.gov.in';
      name = 'Google Student (Mock)';
      avatarUrl = 'https://lh3.googleusercontent.com/a/mock';
    } else {
      if (!googleClient) {
        return next(new AppError('Google Auth is not configured on this server.', 500, 'AUTH_CONFIG_ERROR'));
      }

      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: config.googleClientId,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email || !payload.name) {
        return next(new AppError('Invalid Google Token payload. Missing email or name.', 401, 'UNAUTHORIZED'));
      }

      email = payload.email;
      name = payload.name;
      avatarUrl = payload.picture || '';
    }

    // Find or create User
    let user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true, notificationPreference: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          avatarUrl,
          notificationPreference: {
            create: {
              emailNotificationsEnabled: true,
              reminder30Days: true,
              reminder7Days: true,
              reminder1Day: true,
            },
          },
        },
        include: { profile: true, notificationPreference: true },
      });
      logger.info(`User created via Google OAuth: ${email} (${user.id})`);
    } else {
      logger.info(`User logged in via Google OAuth: ${email} (${user.id})`);
    }

    const token = signToken(user.id);
    setAuthCookie(res, token);

    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          hasProfile: !!user.profile,
          notificationPreference: user.notificationPreference,
        },
      },
      error: null,
    });
  } catch (error) {
    logger.error('Google OAuth failed', error);
    next(new AppError('Google Authentication failed. Please check your credentials.', 401, 'UNAUTHORIZED'));
  }
};

/**
 * Handle Mock Authentication for testing
 */
export const mockAuth = async (req: Request, res: Response, next: NextFunction) => {
  const { username } = req.body;

  if (!username) {
    return next(new AppError('Username is required for mock login', 400, 'VALIDATION_ERROR'));
  }

  try {
    const email = `${username}@govai.gov.in`;
    const name = username
      .split('_')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true, notificationPreference: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
          notificationPreference: {
            create: {
              emailNotificationsEnabled: true,
              reminder30Days: true,
              reminder7Days: true,
              reminder1Day: true,
            },
          },
        },
        include: { profile: true, notificationPreference: true },
      });
      logger.info(`User created via Mock Auth: ${email} (${user.id})`);
    } else {
      logger.info(`User logged in via Mock Auth: ${email} (${user.id})`);
    }

    if (!user) {
      return next(new AppError('User authentication failed', 500, 'INTERNAL_ERROR'));
    }

    const token = signToken(user.id);
    setAuthCookie(res, token);

    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          hasProfile: !!user.profile,
          notificationPreference: user.notificationPreference,
        },
      },
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Log out user (Clear Cookie)
 */
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  res.clearCookie('token');
  res.status(200).json({
    success: true,
    data: { message: 'Logged out successfully' },
    error: null,
  });
};
