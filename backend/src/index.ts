import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { generalLimiter } from './middlewares/rateLimit';
import { errorHandler } from './middlewares/error';
import { logger } from './utils/logger';

import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import schemesRoutes from './routes/schemes';
import recommendationsRoutes from './routes/recommendations';
import chatRoutes from './routes/chat';
import bookmarksRoutes from './routes/bookmarks';
import applicationsRoutes from './routes/applications';
import comparisonRoutes from './routes/comparison';
import remindersRoutes from './routes/reminders';
import reportsRoutes from './routes/reports';
import explanationsRoutes from './routes/explanations';

const app = express();

// Set up security headers via Helmet
app.use(helmet());

// Configure CORS using environment variable
const allowedOrigin = config.frontendUrl;
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl) or matching allowed origin
      if (!origin || origin === allowedOrigin || allowedOrigin === '*') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  })
);

// Rate limiting
app.use(generalLimiter);

// Cookie Parser & Request parsing
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip, userAgent: req.get('User-Agent') });
  next();
});

// API Routes Registration
app.use('/api/v1', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/schemes', schemesRoutes);
app.use('/api/v1/recommendations', recommendationsRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/bookmarks', bookmarksRoutes);
app.use('/api/v1/applications', applicationsRoutes);
app.use('/api/v1/comparison', comparisonRoutes);
app.use('/api/v1/reminders', remindersRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/explanations', explanationsRoutes);

// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    data: null,
    error: {
      code: 'NOT_FOUND',
      message: `Resource not found: ${req.method} ${req.path}`,
    },
  });
});

// Centralized error handler
app.use(errorHandler);

export default app;
