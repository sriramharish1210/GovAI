import { Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/error';
import { AIService } from '../services/AIService';
import { evaluateSchemeEligibility } from '../services/EligibilityEngine';
import { logger } from '../utils/logger';

/**
 * List all chat sessions for the logged-in user
 */
export const getChatSessions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

  try {
    const sessions = await prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      data: sessions,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Start a new chat session
 */
export const createChatSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
  
  const { title = 'New Conversation' } = req.body;

  try {
    const session = await prisma.chatSession.create({
      data: {
        userId,
        title
      }
    });

    res.status(201).json({
      success: true,
      data: session,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all messages in a specific chat session
 */
export const getChatMessages = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const { sessionId } = req.params;

  if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

  try {
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId }
    });

    if (!session) {
      return next(new AppError('Chat session not found or access denied', 404, 'NOT_FOUND'));
    }

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' }
    });

    res.status(200).json({
      success: true,
      data: messages,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send a message and generate AI chatbot reply
 */
export const sendChatMessage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const { sessionId } = req.params;
  const { message } = req.body;

  if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

  try {
    // 1. Verify session ownership
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId }
    });

    if (!session) {
      return next(new AppError('Chat session not found or access denied', 404, 'NOT_FOUND'));
    }

    // 2. Fetch student profile (default to basic if empty)
    const profile = await prisma.studentProfile.findUnique({
      where: { userId }
    });

    // 3. Fetch past messages in session to provide conversational memory (limit to last 10 for performance)
    const pastMessages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 10
    });

    // Format chat history
    const history = pastMessages.map((m: any) => ({
      role: m.role.toLowerCase() as 'user' | 'assistant',
      content: m.content
    }));

    // 4. Fetch relevant student schemes for context
    let relevantSchemes: any[] = [];
    if (profile) {
      const schemes = await prisma.scheme.findMany({
        include: { eligibility: true, benefits: true, documents: true, tags: true }
      });
      // Filter out NOT_ELIGIBLE schemes to reduce token size and ground chatbot recommendations
      relevantSchemes = schemes
        .filter((s: any) => {
          const evalRes = evaluateSchemeEligibility(profile as any, s as any);
          return evalRes.eligibilityStatus !== 'NOT_ELIGIBLE';
        })
        .slice(0, 5); // Feed top 5 eligible schemes as primary context
    }

    // 5. Save the user's message
    const userMsg = await prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'USER',
        content: message
      }
    });

    // 6. Generate AI Response
    // Use fallback profile context if no profile created yet
    const profileContext = profile || {
      state: 'Unknown',
      dob: new Date('2000-01-01'),
      educationLevel: 'Graduate',
      familyIncome: 500000,
      category: 'General',
      gender: 'Prefer not to say',
      disabilityStatus: false,
      minorityStatus: false
    };

    logger.info(`Invoking AI chatbot for session ${sessionId}...`);
    const aiReplyText = await AIService.chatbot(
      profileContext as any,
      history,
      message,
      relevantSchemes as any[]
    );

    // 7. Save the AI's reply
    const assistantMsg = await prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'ASSISTANT',
        content: aiReplyText
      }
    });

    // 8. Update session's updatedAt timestamp
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() }
    });

    res.status(200).json({
      success: true,
      data: assistantMsg,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Rename a specific chat session
 */
export const renameChatSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const { sessionId } = req.params;
  const { title } = req.body;

  if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

  const trimmedTitle = typeof title === 'string' ? title.trim() : '';
  if (!trimmedTitle || trimmedTitle.length > 200) {
    return next(new AppError('Title is invalid or empty', 400, 'VALIDATION_ERROR'));
  }

  try {
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId }
    });

    if (!session) {
      return next(new AppError('Chat session not found or access denied', 404, 'NOT_FOUND'));
    }

    const updatedSession = await prisma.chatSession.update({
      where: { id: sessionId },
      data: { title: trimmedTitle }
    });

    res.status(200).json({
      success: true,
      data: updatedSession,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a specific chat session
 */
export const deleteChatSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const { sessionId } = req.params;

  if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

  try {
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId }
    });

    if (!session) {
      return next(new AppError('Chat session not found or access denied', 404, 'NOT_FOUND'));
    }

    await prisma.chatSession.delete({
      where: { id: sessionId }
    });

    res.status(200).json({
      success: true,
      data: { message: 'Chat session deleted successfully' },
      error: null
    });
  } catch (error) {
    next(error);
  }
};
