import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  public statusCode: number;
  public errorCode: string;
  public details?: any;

  constructor(message: string, statusCode: number, errorCode: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Check if it is a known AppError
  if (err instanceof AppError) {
    logger.warn(`AppError: [${err.errorCode}] ${err.message}`, {
      path: req.path,
      method: req.method,
      details: err.details,
    });
    return res.status(err.statusCode).json({
      success: false,
      data: null,
      error: {
        code: err.errorCode,
        message: err.message,
        ...(process.env.NODE_ENV !== 'production' && err.details ? { details: err.details } : {})
      }
    });
  }

  // Check if it is a Zod validation error (from validation middleware)
  if (err.name === 'ZodError') {
    const issues = err.issues || [];
    const message = issues.map((i: any) => `${i.path.join('.')}: ${i.message}`).join(', ');
    logger.warn(`Validation Error: ${message}`, { path: req.path });
    return res.status(400).json({
      success: false,
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: issues.map((i: any) => ({
          field: i.path.join('.'),
          message: i.message,
        }))
      }
    });
  }

  // Default internal server error
  logger.error(`Unhandled Error: ${err.message}`, err, {
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    data: null,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred. Please try again later.'
    }
  });
};
