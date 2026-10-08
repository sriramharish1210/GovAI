import { Router } from 'express';
import { generateReport, getReportsHistory } from '../controllers/reports';
import { authenticate } from '../middlewares/auth';
import { aiLimiter } from '../middlewares/rateLimit';

const router = Router();

// Reports require authentication
router.use(authenticate);

router.post('/generate', aiLimiter, generateReport);
router.get('/', getReportsHistory);

export default router;
