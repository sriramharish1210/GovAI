import { Router } from 'express';
import { explainTerm, summarizeScheme } from '../controllers/explanations';
import { aiLimiter } from '../middlewares/rateLimit';

const router = Router();

router.post('/term', aiLimiter, explainTerm);
router.get('/scheme/:id', aiLimiter, summarizeScheme);

export default router;
