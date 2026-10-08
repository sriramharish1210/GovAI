import { prisma } from '../utils/db';
import { EmailService } from './EmailService';
import { logger } from '../utils/logger';

export class ReminderProcessor {
  /**
   * Process all pending deadline reminders across the database
   */
  public static async processPendingReminders(): Promise<{ processed: number; sent: number; errors: number }> {
    const now = new Date();
    let processedCount = 0;
    let sentCount = 0;
    let errorCount = 0;

    try {
      logger.info('Starting ReminderProcessor run...');

      // 1. Fetch pending reminders where triggerDate <= now and isSent = false
      const pendingReminders = await prisma.reminder.findMany({
        where: {
          isSent: false,
          triggerDate: {
            lte: now
          }
        },
        include: {
          user: {
            include: {
              notificationPreference: true
            }
          },
          scheme: true
        }
      });

      logger.info(`Found ${pendingReminders.length} pending reminder(s) to evaluate.`);

      for (const reminder of pendingReminders) {
        processedCount++;
        const { user, scheme, daysBefore } = reminder;

        if (!user || !scheme) continue;

        // 2. Check user notification preferences
        const pref = user.notificationPreference;
        if (!pref || !pref.emailNotificationsEnabled) {
          logger.info(`Skipping reminder ${reminder.id}: User ${user.email} has disabled email notifications.`);
          continue;
        }

        let isPreferenceEnabled = true;
        if (daysBefore === 30) isPreferenceEnabled = pref.reminder30Days;
        else if (daysBefore === 7) isPreferenceEnabled = pref.reminder7Days;
        else if (daysBefore === 1) isPreferenceEnabled = pref.reminder1Day;

        if (!isPreferenceEnabled) {
          logger.info(`Skipping reminder ${reminder.id}: User ${user.email} disabled ${daysBefore}-day reminders.`);
          continue;
        }

        // 3. Send email notification
        const deadlineStr = scheme.deadline ? new Date(scheme.deadline).toLocaleDateString() : 'Upcoming';
        const officialUrl = scheme.officialApplicationUrl || scheme.officialSourceUrl;

        const emailSent = await EmailService.sendReminderNotification(
          user.email,
          user.name,
          scheme.name,
          daysBefore,
          deadlineStr,
          officialUrl
        );

        if (emailSent) {
          // 4. Update reminder status in database
          await prisma.reminder.update({
            where: { id: reminder.id },
            data: {
              isSent: true,
              sentAt: new Date()
            }
          });
          sentCount++;
          logger.info(`Successfully sent ${daysBefore}-day reminder to ${user.email} for scheme "${scheme.name}"`);
        } else {
          errorCount++;
          logger.warn(`Failed to dispatch reminder email to ${user.email}`);
        }
      }

      logger.info(`ReminderProcessor finished: Processed=${processedCount}, Sent=${sentCount}, Errors=${errorCount}`);
      return { processed: processedCount, sent: sentCount, errors: errorCount };

    } catch (error) {
      logger.error('Error executing ReminderProcessor', error);
      throw error;
    }
  }
}
