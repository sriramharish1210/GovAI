import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  dbUrl: process.env.DATABASE_URL || 'file:./dev.db',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  authSecret: process.env.AUTH_SECRET || 'dev_secret_key_12345678',
  aiMode: (process.env.AI_MODE || 'mock') as 'gemini' | 'mock',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  emailProviderKey: process.env.EMAIL_PROVIDER_KEY || '',
  emailFrom: process.env.EMAIL_FROM || 'no-reply@govai.gov.in',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMaxGeneral: parseInt(process.env.RATE_LIMIT_MAX_GENERAL || '1000', 10),
  rateLimitMaxAi: parseInt(process.env.RATE_LIMIT_MAX_AI || '1000', 10),
};

// Validate AI Configuration
if (config.aiMode === 'gemini' && !config.geminiApiKey) {
  throw new Error('CRITICAL CONFIGURATION ERROR: AI_MODE is set to "gemini" but GEMINI_API_KEY is not defined.');
}

console.log(`[Config] Loaded config. Port: ${config.port}. AI Mode: ${config.aiMode}. Model: ${config.geminiModel}.`);
