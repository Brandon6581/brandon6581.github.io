/**
 * The Ascension Matrix: prestige maths.
 *
 * Pure functions and constants only. This module must not import economy.ts -
 * economy reads the multiplier from here, and an import back would be a runtime
 * cycle (see the note in offlineBonus.ts for how that bit once already).
 *
 * A naming note, because the blueprint and the codebase use different words for
 * the same things. The blueprint's `allTimeAccumulatedCash` is this game's
 * `lifetimeGoo`, and `currentCash` is `goo`. Rather than rename two fields that
 * are threaded through twenty files and a persisted save, the selectors below
 * take plain numbers, so they read exactly as specified at every call site.
 */

export const ASCENSION_CONSTANTS = {
  BASE_THRESHOLD: 1_000_000,
  ESSENCE_MULTIPLIER: 1_500,
  PER_ESSENCE_BONUS: 0.02,
};

export const gameplaySelectors = {
  /**
   * Total essence a given all-time earnings figure is worth.
   *
   * Note "total", not "still owed". Earnings are cumulative and never reset, so
   * this number only ever grows - which means it is *not* safe to hand out
   * directly on every ascension. See `awardableEssence`.
   */
  calculatePendingEssence: (allTimeCash: number): number => {
    if (allTimeCash < ASCENSION_CONSTANTS.BASE_THRESHOLD) {
      return 0;
    }
    const ratio = allTimeCash / ASCENSION_CONSTANTS.BASE_THRESHOLD;
    const rawEssence = ASCENSION_CONSTANTS.ESSENCE_MULTIPLIER * Math.sqrt(ratio);
    return Math.floor(rawEssence);
  },

  /** Permanent production and tap bonus from essence held. */
  getGlobalProductionMultiplier: (slimeEssence: number): number => {
    return 1 + slimeEssence * ASCENSION_CONSTANTS.PER_ESSENCE_BONUS;
  },
};

/**
 * What an ascension right now would actually pay.
 *
 * This is the guard that stops the loop being farmable. `calculatePendingEssence`
 * is a function of lifetime earnings alone, and lifetime earnings survive an
 * ascension by design - so calling it twice in a row would return the same
 * number twice and mint essence out of nothing. Ascend at 1M twice and you would
 * hold 3,000 essence having earned 1,500.
 *
 * Subtracting what has already been paid out makes the award the *increment*
 * since the last ascension, so essence tracks earnings exactly once. It also
 * means a player must genuinely grow their lifetime total to ascend again, which
 * is the intended shape of the loop.
 */
export function awardableEssence(allTimeCash: number, essenceAlreadyEarned: number): number {
  const total = gameplaySelectors.calculatePendingEssence(allTimeCash);
  return Math.max(0, total - essenceAlreadyEarned);
}

/**
 * All-time earnings needed before the next ascension pays anything at all.
 *
 * Inverts the formula: the point where total essence would tick past what has
 * already been earned. Used to show progress toward the gate.
 */
export function nextAscensionAt(essenceAlreadyEarned: number): number {
  const target = essenceAlreadyEarned + 1;
  const ratio = target / ASCENSION_CONSTANTS.ESSENCE_MULTIPLIER;
  return Math.max(ASCENSION_CONSTANTS.BASE_THRESHOLD, ratio * ratio * ASCENSION_CONSTANTS.BASE_THRESHOLD);
}

/** Progress toward the next ascension, 0 to 1, for a progress bar. */
export function ascensionProgress(allTimeCash: number, essenceAlreadyEarned: number): number {
  const target = nextAscensionAt(essenceAlreadyEarned);
  if (target <= 0) return 1;
  return Math.max(0, Math.min(1, allTimeCash / target));
}

/**
 * The bonus as a percentage string: essence x 0.02 x 100.
 *
 * Guarded, because this renders in a header the player sees constantly and a
 * corrupt save should degrade to "+0%" rather than "+NaN%".
 */
export function essenceBonusPercent(slimeEssence: number): number {
  if (!Number.isFinite(slimeEssence) || slimeEssence <= 0) return 0;
  return slimeEssence * ASCENSION_CONSTANTS.PER_ESSENCE_BONUS * 100;
}

export function describeEssenceBonus(slimeEssence: number): string {
  const pct = essenceBonusPercent(slimeEssence);
  return `+${Math.round(pct).toLocaleString('en-US')}%`;
}
