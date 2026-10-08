import { Router } from 'express';
import { compareSchemes } from '../controllers/comparison';

const router = Router();

// Endpoint for scheme comparison (accepts array of 2-4 scheme IDs in request body)
router.post('/', compareSchemes);

export default router;
