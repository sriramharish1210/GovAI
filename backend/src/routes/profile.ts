import { Router } from 'express';
import { getProfile, upsertProfile, updateNotificationPreferences } from '../controllers/profile';
import { authenticate } from '../middlewares/auth';
import { validateRequest } from '../middlewares/validation';
import { profileSchema, notificationPreferenceSchema } from '../utils/validationSchemas';

const router = Router();

// Apply auth check globally to profile routes
router.use(authenticate);

router.get('/', getProfile);
router.put('/', validateRequest(profileSchema), upsertProfile);
router.post('/', validateRequest(profileSchema), upsertProfile);
router.put('/preferences', validateRequest(notificationPreferenceSchema), updateNotificationPreferences);

export default router;
