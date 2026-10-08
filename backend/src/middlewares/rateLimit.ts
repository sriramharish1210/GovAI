import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { AppError } from './error';

export const generalLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxGeneral,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new AppError('Too many requests from this IP. Please try again later.', 429, 'RATE_LIMIT_EXCEEDED'));
  },
});

export const aiLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxAi,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new AppError('AI rate limit exceeded. Please wait before making more requests.', 429, 'RATE_LIMIT_EXCEEDED'));
  },
});
