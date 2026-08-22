/**
 * ============================================================================
 * DEVELOPER TESTING MODE - NOT FOR PRODUCTION
 * ============================================================================
 *
 * Unlocks every paid entitlement so the shop, ads, skins and identity features
 * can be exercised without spending money or waiting on drop odds.
 *
 * ## Why this cannot ship
 *
 * A "free everything" backdoor in a live build is an App Store rejection risk,
 * and a straightforward exploit if a player finds it. So the feature is gated
 * at BUILD time, not runtime:
 *
 *   `DEV_MODE_AVAILABLE` is derived from `__DEV__`, which React Native defines
 *   as a literal `true` in development and `false` in release builds. Metro's
 *   minifier constant-folds it and dead-code-eliminates the branches, so in a
 *   production bundle the UI, the activation code, and the unlock logic are
 *   all physically absent - not merely disabled.
 *
 * Three properties follow, and all three are worth preserving:
 *
 *   1. The Settings code field does not render when this is false.
 *   2. `isDevUnlockActive()` returns false, so even a hand-edited save with
 *      `devModeEnabled: true` grants nothing in a release build.
 *   3. The activation code string is not present in the shipped bundle, so it
 *      cannot be discovered by grepping the JS.
 *
 * ## Verifying before submission
 *
 * `npm run check:no-dev-mode` exports a production bundle and fails if any
 * dev-mode marker survives. Run it before every store submission.
 *
 * ## If you need dev mode in a TestFlight / internal build
 *
 * Those builds are release builds, so `__DEV__` is false and dev mode is off.
 * Do NOT relax the gate below to get around that. Instead build that profile
 * with `EXPO_PUBLIC_ENABLE_DEV_MODE=true` and use the opt-in line documented
 * below - and never set that variable on the production profile.
 * ============================================================================
 */

/**
 * Readable alias for the build-time switch, for guards whose bodies contain
 * nothing sensitive (store actions that just return early).
 *
 * IMPORTANT: do not use this to guard UI, strings, or anything that must be
 * absent from a release bundle - see the note on `isDevCode` below. Use a
 * direct `__DEV__` test in the same file instead.
 *
 * To allow dev mode in an internal release build, change this to:
 *   export const DEV_MODE_AVAILABLE =
 *     __DEV__ || process.env.EXPO_PUBLIC_ENABLE_DEV_MODE === 'true';
 * and set that env var on the internal EAS profile only.
 */
export const DEV_MODE_AVAILABLE: boolean = __DEV__;

/**
 * Activation code. Obscurity is not the safeguard here - the build gate is -
 * so this is plain and readable on purpose. It never reaches a release bundle.
 */
const DEV_CODE = 'slimetime';

/**
 * True when the typed text matches the activation code.
 *
 * Note the direct `__DEV__` reference rather than `DEV_MODE_AVAILABLE`. Babel
 * inlines `__DEV__` as a literal per module, but Metro does NOT propagate
 * constants across module boundaries - so a gate written in terms of an
 * imported constant stays a live runtime check and keeps the guarded code
 * (and its strings) in the shipped bundle. Anything guarding code that must
 * not ship has to test `__DEV__` in the same file it lives in.
 */
export function isDevCode(input: string): boolean {
  return __DEV__ && input.trim().toLowerCase() === DEV_CODE;
}

/** Goo granted by the dev panel's top-up button, for exercising the economy. */
export const DEV_GOO_GRANT = 1_000_000_000;
