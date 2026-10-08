import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(__dirname, '../../logs');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function writeToFile(level: string, message: string, meta?: any) {
  const timestamp = new Date().toISOString();
  const logObj = { timestamp, level, message, ...meta };
  const logLine = JSON.stringify(logObj) + '\n';
  
  try {
    fs.appendFileSync(path.join(LOG_DIR, 'app.log'), logLine);
    if (level === 'ERROR' || level === 'CRITICAL') {
      fs.appendFileSync(path.join(LOG_DIR, 'error.log'), logLine);
    }
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
}

export const logger = {
  info: (message: string, meta?: any) => {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] INFO: ${message}`, meta ? JSON.stringify(meta) : '');
    writeToFile('INFO', message, meta);
  },
  warn: (message: string, meta?: any) => {
    const time = new Date().toLocaleTimeString();
    console.warn(`[${time}] WARN: ${message}`, meta ? JSON.stringify(meta) : '');
    writeToFile('WARN', message, meta);
  },
  error: (message: string, error?: any, meta?: any) => {
    const time = new Date().toLocaleTimeString();
    const errorMsg = error instanceof Error ? error.stack || error.message : error;
    console.error(`[${time}] ERROR: ${message}`, errorMsg ? `\nDetails: ${errorMsg}` : '', meta ? JSON.stringify(meta) : '');
    writeToFile('ERROR', message, { error: errorMsg, ...meta });
  },
  critical: (message: string, error?: any, meta?: any) => {
    const time = new Date().toLocaleTimeString();
    const errorMsg = error instanceof Error ? error.stack || error.message : error;
    console.error(`[${time}] CRITICAL: ${message}`, errorMsg ? `\nDetails: ${errorMsg}` : '', meta ? JSON.stringify(meta) : '');
    writeToFile('CRITICAL', message, { error: errorMsg, ...meta });
  }
};
