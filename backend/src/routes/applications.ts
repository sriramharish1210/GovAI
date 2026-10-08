import { Router } from 'express';
import { getApplications, upsertApplication } from '../controllers/applications';
import { authenticate } from '../middlewares/auth';
import { validateRequest } from '../middlewares/validation';
import { applicationSchema } from '../utils/validationSchemas';

const router = Router();

// Applications require authentication
router.use(authenticate);

router.get('/', getApplications);
router.post('/', validateRequest(applicationSchema), upsertApplication);

export default router;
