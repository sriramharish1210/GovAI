import { Router } from 'express';
import { googleAuth, mockAuth, logout } from '../controllers/auth';

const router = Router();

router.post('/google', googleAuth);
router.post('/mock', mockAuth);
router.post('/logout', logout);

export default router;
