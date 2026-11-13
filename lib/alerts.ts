import { consumeRateLimit } from './rate-limit';
import { sendTelegram, telegramConfigured } from './telegram';

/**
 * Tells the owner on Telegram that something visitors depend on is broken. At most one message per `key` per hour
 * so a burst of visits during an outage does not flood the chat. Never throws: an alert must not make a failure worse.
 */
export async function alertOutage(key: string, text: string): Promise<boolean> {
  try {
    if (!telegramConfigured()) return false;
    if (!(await consumeRateLimit(`outage-${key}`, key, 1))) return false;
    await sendTelegram(`DRM Stays: ${text}\n\nOpen /admin/health to see the details.`);
    return true;
  } catch (error) {
    console.error('Outage alert failed', error instanceof Error ? error.name : 'unknown error');
    return false;
  }
}
