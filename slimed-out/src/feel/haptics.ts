import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * The haptics engine.
 *
 * Every vibration in the app goes through here rather than calling
 * `expo-haptics` directly, for three reasons:
 *
 *  1. **It can be turned off.** Haptics are the kind of thing people either
 *     love or immediately want gone, and a game whose main verb is tapping
 *     buzzes a *lot*. The player's setting is checked at the call site, so a
 *     toggle flipped mid-session takes effect on the very next tap.
 *
 *  2. **It never throws.** A tap must add goo whether or not the vibration
 *     motor cooperates. `expo-haptics` returns a promise that rejects on
 *     hardware without a motor, and an unhandled rejection inside a tap
 *     handler is a crash for a purely decorative effect. Everything below is
 *     fire-and-forget with the rejection swallowed.
 *
 *  3. **It is named for the moment, not the waveform.** Call sites say
 *     `haptics.tap()` or `haptics.rareReward()`. Which physical pattern that
 *     maps to is a tuning decision that lives here, so re-feeling the whole
 *     game is one file rather than a search across screens.
 *
 * Web has no vibration API worth using through this module, so it no-ops.
 */

/** Resolved once: the platform cannot change under a running app. */
const SUPPORTED = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Read at every call so the Settings toggle applies immediately. Assigned by
 * `setHapticsEnabled`, which the app wires to the persisted setting.
 */
let enabled = true;

export function setHapticsEnabled(next: boolean): void {
  enabled = next;
}

export function hapticsSupported(): boolean {
  return SUPPORTED;
}

/** Runs an effect unless haptics are off or unsupported, swallowing failures. */
function fire(effect: () => Promise<void>): void {
  if (!SUPPORTED || !enabled) return;
  // No await: the caller is mid-tap and must not wait on the motor.
  effect().catch(() => {
    // A missing or busy vibration motor is not an error worth surfacing.
  });
}

export const haptics = {
  /** A manual goo tap. The most frequent effect in the app by a wide margin. */
  tap: () =>
    fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),

  /** Catching a rare visitor, or turning up the golden variant. */
  rareReward: () =>
    fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),

  /** A purchase went through, or a reward was claimed. */
  confirm: () =>
    fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),

  /** An achievement unlocked, or a bonus round landed a top band. */
  milestone: () =>
    fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),

  /** Something was refused: too expensive, still on cooldown. */
  denied: () =>
    fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
