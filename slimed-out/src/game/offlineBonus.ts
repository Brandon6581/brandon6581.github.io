import {
  WELCOME_BACK_MAX,
  WELCOME_BACK_MIN_AWAY_MS,
  WELCOME_BACK_PER_HOUR,
} from './dailyData';

/**
 * The welcome-back bonus, extracted here to break an import cycle.
 *
 * This function used to live in daily.ts. That made the module graph circular:
 * economy.ts called `welcomeBackBonus` from daily.ts, while daily.ts called
 * `steadyGps` from economy.ts. Both edges are real runtime calls, not
 * type-only imports that erase at compile time, so Metro reported a genuine
 * cycle - and a cycle between two modules that both run work at import time is
 * how one of them ends up half-initialised depending on which side loads first.
 *
 * The cut is here because this is the only piece either module needed from the
 * other's side that does not itself depend on the economy. It takes two plain
 * numbers and reads three constants, so it can sit below both:
 *
 *     economy.ts ──> offlineBonus.ts ──> dailyData.ts
 *     daily.ts   ──> economy.ts
 *
 * One direction only. Keep it that way: if this file ever needs something from
 * economy.ts, the cycle is back.
 */

/**
 * Extra goo for having been away, layered on top of offline earnings rather
 * than replacing them: a share of what was earned offline, growing with hours
 * away and capped so a very long absence cannot dwarf active play.
 */
export function welcomeBackBonus(offlineGoo: number, awayMs: number): number {
  if (awayMs < WELCOME_BACK_MIN_AWAY_MS || offlineGoo <= 0) return 0;
  const hours = awayMs / (60 * 60 * 1000);
  const share = Math.min(WELCOME_BACK_MAX, hours * WELCOME_BACK_PER_HOUR);
  return Math.ceil(offlineGoo * share);
}
