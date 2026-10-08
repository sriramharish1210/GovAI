import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../utils/db';
import { AppError } from './error';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

/**
 * Require valid authentication token. Throws 401 if missing/invalid.
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  let token = req.cookies?.token;

  // Fallback to Bearer token header if cookie is not present (for dev/testing)
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Authentication token is missing. Please log in.', 401, 'UNAUTHORIZED'));
  }

  try {
    const decoded = jwt.verify(token, config.authSecret) as { userId: string };
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true }
    });

    if (!user) {
      return next(new AppError('User not found. Session might be invalid.', 401, 'UNAUTHORIZED'));
    }

    req.user = user;
    next();
  } catch (error) {
    return next(new AppError('Invalid or expired authentication token. Please log in again.', 401, 'UNAUTHORIZED'));
  }
};

/**
 * Optional authentication middleware. Will attach user if valid token exists,
 * but allows public access if missing or invalid.
 */
export const optionalAuthenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  let token = req.cookies?.token;

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.authSecret) as { userId: string };
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true }
    });

    if (user) {
      req.user = user;
    }
  } catch (error) {
    // Suppress authentication errors to permit public access
  }
  
  next();
};

export default authenticate;
