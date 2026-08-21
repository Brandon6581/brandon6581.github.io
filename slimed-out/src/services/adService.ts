/**
 * Interstitial ad pacing + service abstraction.
 *
 * This app ships with a `DevAdService` that simulates an interstitial with
 * an in-app modal, so the whole gating/UX flow can be built and tested
 * without any store credentials. To go live:
 *
 *   1. `npx expo install react-native-google-mobile-ads` (requires an
 *      EAS/custom dev client build - it will not run in Expo Go).
 *   2. Create an interstitial ad unit in the AdMob console and drop the
 *      unit IDs into app.json / an env file.
 *   3. Implement `AdService` using `InterstitialAd.createForAdRequest(...)`
 *      from that package (load on mount, `.show()` inside `showInterstitial`,
 *      resolve the returned promise from the CLOSED event) and swap it in
 *      wherever `DevAdService` is constructed today (see
 *      `components/AdGateProvider.tsx`).
 *
 * Everything in this file about *when* to show an ad (pacing) is
 * independent of which SDK ends up drawing it.
 */

export interface AdService {
  /** Resolves once the ad has been shown and dismissed (or immediately if unavailable). */
  showInterstitial: () => Promise<void>;
}

/** Simulates an ad network round trip; the actual UI lives in AdModal. */
export function createDevAdService(presentModal: () => Promise<void>): AdService {
  return {
    showInterstitial: presentModal,
  };
}

export interface AdPacingConfig {
  /** No interstitial at all until the player has earned this much lifetime goo. */
  firstAdMinLifetimeGoo: number;
  /** No interstitial at all until this much time has passed in the current session. */
  firstAdMinSessionMs: number;
  /** Minimum time between any two interstitials. */
  minIntervalMs: number;
}

export const DEFAULT_AD_PACING: AdPacingConfig = {
  // Roughly "a couple of slimes in" - well past the very first few minutes.
  firstAdMinLifetimeGoo: 2_500,
  firstAdMinSessionMs: 4 * 60 * 1000,
  minIntervalMs: 4 * 60 * 1000,
};

export interface AdGateState {
  noAdsPurchased: boolean;
  lifetimeGoo: number;
  lastAdShownAt: number;
  sessionStartedAt: number;
}

export function shouldShowInterstitial(
  state: AdGateState,
  nowMs: number,
  config: AdPacingConfig = DEFAULT_AD_PACING
): boolean {
  if (state.noAdsPurchased) return false;
  if (state.lifetimeGoo < config.firstAdMinLifetimeGoo) return false;
  if (nowMs - state.sessionStartedAt < config.firstAdMinSessionMs) return false;
  if (state.lastAdShownAt > 0 && nowMs - state.lastAdShownAt < config.minIntervalMs) return false;
  return true;
}
