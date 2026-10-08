import { Router } from 'express';
import { 
  getReminders, 
  createReminder, 
  deleteReminder, 
  triggerReminderProcess 
} from '../controllers/reminders';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Reminders require authentication
router.use(authenticate);

router.get('/', getReminders);
router.post('/', createReminder);
router.delete('/:id', deleteReminder);
router.post('/process', triggerReminderProcess);

export default router;
