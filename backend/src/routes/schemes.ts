import { Router } from 'express';
import { getSchemes, getSchemeById } from '../controllers/schemes';
import { optionalAuthenticate } from '../middlewares/auth';
import { validateRequest } from '../middlewares/validation';
import { schemeQuerySchema } from '../utils/validationSchemas';

const router = Router();

// Apply optional authentication so we can sort by relevance if logged in
router.get('/', optionalAuthenticate, validateRequest(schemeQuerySchema), getSchemes);
router.get('/:id', optionalAuthenticate, getSchemeById);

export default router;
