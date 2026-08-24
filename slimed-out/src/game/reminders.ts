import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Local daily streak reminders. No push server, no tokens, no network - these
 * are scheduled on the device and fire from the device.
 *
 * Two rules shape everything here:
 *
 * **Opt in, never opt out.** Nothing is requested or scheduled until the player
 * turns the setting on. A game that asks for notification permission on first
 * launch gets denied by most people and then has no second chance, so the
 * prompt is deferred to the moment they ask for reminders.
 *
 * **Always clear before scheduling.** Every scheduling call cancels what this
 * app scheduled first. Without that, toggling the setting a few times leaves
 * several identical daily reminders queued and the player gets buzzed three
 * times each evening - the single most common way this feature goes wrong.
 */

/** Android needs an explicit channel or notifications are silently dropped. */
const CHANNEL_ID = 'streak-reminders';

/** Local hour the reminder fires. Evening: a missed streak is still saveable. */
export const REMINDER_HOUR = 19;
export const REMINDER_MINUTE = 0;

export interface ReminderSetupResult {
  ok: boolean;
  /** Set when permission was refused, so the caller can explain rather than fail silently. */
  reason?: 'denied' | 'unsupported' | 'error';
  message: string;
}

/** Web has no local-notification scheduling worth using here. */
function supported(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Streak reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: undefined,
    vibrationPattern: [0, 200],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

/**
 * Cancels every reminder this app has scheduled.
 *
 * Deliberately cancels *all* of this app's scheduled notifications rather than
 * tracking identifiers: the app schedules nothing else, and an identifier list
 * that drifts out of sync with reality is how duplicates survive a "clear".
 */
export async function clearScheduledReminders(): Promise<void> {
  if (!supported()) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // A failure to clear is not worth surfacing; the reschedule below is what
    // the player actually asked for.
  }
}

/**
 * Clears any previous schedule and queues one reminder that repeats daily.
 *
 * Uses a calendar trigger at a fixed local time rather than a 24-hour interval.
 * An interval trigger drifts: it counts from whenever it was last scheduled, so
 * a player who re-enables the setting at 3am starts getting 3am reminders. A
 * daily calendar trigger always lands in the evening, which is the point.
 */
export async function scheduleDailyReminder(): Promise<ReminderSetupResult> {
  if (!supported()) {
    return { ok: false, reason: 'unsupported', message: 'Reminders need a phone or tablet.' };
  }

  try {
    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;

    if (!granted && existing.canAskAgain) {
      const asked = await Notifications.requestPermissionsAsync();
      granted = asked.granted;
    }

    if (!granted) {
      return {
        ok: false,
        reason: 'denied',
        message: 'Notifications are turned off for Slimed Out in your device settings.',
      };
    }

    await ensureAndroidChannel();
    await clearScheduledReminders();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Your slimes are waiting',
        body: 'Pop in to keep your login streak going.',
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: REMINDER_HOUR,
        minute: REMINDER_MINUTE,
      },
    });

    return { ok: true, message: `Reminder set for ${REMINDER_HOUR}:00 each day.` };
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error';
    return { ok: false, reason: 'error', message: `Could not set a reminder. ${detail}` };
  }
}

/** How many reminders are currently queued. Used to verify, not for logic. */
export async function scheduledReminderCount(): Promise<number> {
  if (!supported()) return 0;
  try {
    return (await Notifications.getAllScheduledNotificationsAsync()).length;
  } catch {
    return 0;
  }
}
