import { logger } from '../utils/logger';
import { config } from '../config';

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailProvider {
  sendEmail(options: EmailOptions): Promise<boolean>;
}

export class ConsoleEmailProvider implements EmailProvider {
  public async sendEmail(options: EmailOptions): Promise<boolean> {
    logger.info(`[Email Dispatched via Console Provider]`);
    logger.info(`TO: ${options.to}`);
    logger.info(`SUBJECT: ${options.subject}`);
    logger.info(`BODY: ${options.text}`);
    return true;
  }
}

export class EmailService {
  private static provider: EmailProvider = new ConsoleEmailProvider();

  public static setProvider(provider: EmailProvider) {
    this.provider = provider;
  }

  public static async sendReminderNotification(
    userEmail: string,
    userName: string,
    schemeName: string,
    daysRemaining: number,
    deadlineDate: string,
    officialUrl: string
  ): Promise<boolean> {
    const subject = `[GovAI Reminder] ${daysRemaining}-Day Alert: ${schemeName} Application Deadline`;
    const text = `Hello ${userName},\n\nThis is a reminder that the application deadline for "${schemeName}" is in ${daysRemaining} days (${deadlineDate}).\n\nPlease visit the official portal to apply or complete your application:\n${officialUrl}\n\nBest regards,\nGovAI Team`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 24px;">
        <h2 style="color: #1e3a8a; margin-top: 0;">GovAI Scheme Deadline Alert</h2>
        <p>Hello <strong>${userName}</strong>,</p>
        <p>This is a reminder that the application deadline for <strong>${schemeName}</strong> is approaching in <strong>${daysRemaining} day${daysRemaining > 1 ? 's' : ''}</strong> (${deadlineDate}).</p>
        <div style="margin: 24px 0;">
          <a href="${officialUrl}" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Apply on Official Portal</a>
        </div>
        <p style="color: #6b7280; font-size: 12px;">You are receiving this email based on your saved reminders on GovAI.</p>
      </div>
    `;

    try {
      return await this.provider.sendEmail({ to: userEmail, subject, text, html });
    } catch (err) {
      logger.error(`Failed to send email to ${userEmail}`, err);
      return false;
    }
  }
}
