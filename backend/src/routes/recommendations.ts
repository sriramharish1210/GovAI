import { Router } from 'express';
import { getRecommendations } from '../controllers/recommendations';
import { authenticate } from '../middlewares/auth';
import { aiLimiter } from '../middlewares/rateLimit';

const router = Router();

// Recommendations require authentication
router.use(authenticate);

// Allow optional AI rate limiter when explain=true
router.get('/', aiLimiter, getRecommendations);

export default router;
