import { Router } from 'express';
import { 
  getChatSessions, 
  createChatSession, 
  getChatMessages, 
  sendChatMessage,
  renameChatSession,
  deleteChatSession
} from '../controllers/chat';
import { authenticate } from '../middlewares/auth';
import { validateRequest } from '../middlewares/validation';
import { aiLimiter } from '../middlewares/rateLimit';
import { chatbotMessageSchema, renameChatSessionSchema } from '../utils/validationSchemas';

const router = Router();

// Require user to be authenticated for all chat requests
router.use(authenticate);

router.get('/sessions', getChatSessions);
router.post('/sessions', createChatSession);
router.patch('/sessions/:sessionId', validateRequest(renameChatSessionSchema), renameChatSession);
router.delete('/sessions/:sessionId', deleteChatSession);
router.get('/sessions/:sessionId/messages', getChatMessages);

// Protect chatbot query endpoint with specific AI Rate Limiter
router.post(
  '/sessions/:sessionId/messages', 
  aiLimiter, 
  validateRequest(chatbotMessageSchema), 
  sendChatMessage
);

export default router;
