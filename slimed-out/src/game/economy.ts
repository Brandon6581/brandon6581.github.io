import { ownedItemIds, ownedSkinIds } from './entitlements';
import { welcomeBackBonus } from './daily';
import { SKIN_BY_ID } from './skinData';
import { SHOP_ITEM_BY_ID } from './shopData';
import { SLIME_BY_ID, SLIMES } from './slimeData';
import { GameState, OfflineResult, OwnedSlimeState, SLIME_UPGRADE_MILESTONES, SlimeDef } from './types';

/** Cost to buy the next unit of a slime, given how many are already owned. */
export function costForNextSlime(def: SlimeDef, owned: number): number {
  return Math.ceil(def.baseCost * Math.pow(def.costGrowth, owned));
}

/** Cost of the per-slime production upgrade unlocked at a given owned-count milestone. */
export function costForSlimeUpgrade(def: SlimeDef, milestoneIndex: number): number {
  const milestone = SLIME_UPGRADE_MILESTONES[milestoneIndex];
  return Math.ceil(costForNextSlime(def, milestone) * 5);
}

/** Each purchased milestone upgrade doubles that slime's per-unit output. */
export function slimeUpgradeMultiplier(upgradeLevels: number): number {
  return Math.pow(2, upgradeLevels);
}

export function totalSlimesOwned(state: GameState): number {
  return Object.values(state.slimes).reduce((sum, s) => sum + s.count, 0);
}

/** Free milestone bonus: +10% global production for every 25 total slimes owned. */
export function globalMilestoneMultiplier(state: GameState): number {
  return 1 + Math.floor(totalSlimesOwned(state) / 25) * 0.1;
}

/** Bonus from purchased shop items (small and optional by design). */
export function shopGlobalMultiplier(state: GameState): number {
  let mult = 1;
  for (const id of ownedItemIds(state)) {
    const def = SHOP_ITEM_BY_ID[id];
    if (def?.effect.kind === 'globalProductionMult') mult += def.effect.value;
  }
  return mult;
}

/**
 * Collectibles can carry a standing bonus for as long as they are owned. The
 * bonus lives on the skin definition (see skinData.ts), so adding another perk
 * skin later needs no change here.
 */
export function skinPerkMultipliers(state: GameState): { production: number; tap: number } {
  let production = 1;
  let tap = 1;
  for (const id of ownedSkinIds(state)) {
    const perk = SKIN_BY_ID[id]?.perk;
    if (perk) {
      production += perk.production;
      tap += perk.tap;
    }
  }
  return { production, tap };
}

/** Production multiplier contributed by owned collectibles. */
export function skinGlobalMultiplier(state: GameState): number {
  return skinPerkMultipliers(state).production;
}

export function isBoostActive(state: GameState, nowMs: number = Date.now()): boolean {
  return state.boostExpiresAt > nowMs;
}

/** Time-limited boost multiplier, or 1 when none is running. */
export function boostMultiplier(state: GameState, nowMs: number = Date.now()): number {
  return isBoostActive(state, nowMs) ? state.boostMultiplier : 1;
}

/**
 * Everything that scales production, excluding the temporary boost. Offline
 * earnings need this separately so the boost can be credited only for the
 * slice of time it was actually running.
 */
export function baseGlobalMultiplier(state: GameState): number {
  return globalMilestoneMultiplier(state) * shopGlobalMultiplier(state) * skinGlobalMultiplier(state);
}

/** Full multiplier including any running boost. Use for live play and display. */
export function globalMultiplier(state: GameState, nowMs: number = Date.now()): number {
  return baseGlobalMultiplier(state) * boostMultiplier(state, nowMs);
}

/** Production per second before any global multiplier. */
export function rawGps(state: GameState): number {
  let total = 0;
  for (const def of SLIMES) {
    const owned = state.slimes[def.id];
    if (!owned || owned.count <= 0) continue;
    total += owned.count * def.baseGps * slimeUpgradeMultiplier(owned.upgradeLevels);
  }
  return total;
}

/** Total goo per second across the whole collection, boost included. */
export function computeGps(state: GameState, nowMs: number = Date.now()): number {
  return rawGps(state) * globalMultiplier(state, nowMs);
}

/**
 * How much of a tap comes from production rather than flat tap power.
 *
 * A purely flat tap power cannot keep up with an idle curve: by mid-game a
 * fully-upgraded tap was worth about 0.15 seconds of passive income, so
 * tapping felt like it did nothing even though it was adding goo. Giving each
 * tap a *share of current production* makes active play stay meaningful at
 * every tier, and it scales itself as new slimes are added - no need to
 * re-tune tap numbers every time the roster grows.
 */
export const TAP_BASE_GPS_SECONDS = 0.05;
export const TAP_GPS_SECONDS_PER_UPGRADE = 0.02;

/** Seconds of production each tap is worth, given upgrades purchased. */
export function tapGpsSeconds(state: GameState): number {
  return TAP_BASE_GPS_SECONDS + state.purchasedTapUpgrades.length * TAP_GPS_SECONDS_PER_UPGRADE;
}

/**
 * Goo awarded for a single tap: flat tap power (which carries the early game,
 * before there is any production to take a share of) plus a slice of current
 * output. The golden variant adds a further bonus on the flat part.
 */
export function computeTapValue(state: GameState, nowMs: number = Date.now()): number {
  const flat = state.tapPower * skinPerkMultipliers(state).tap * globalMultiplier(state, nowMs);
  const share = computeGps(state, nowMs) * tapGpsSeconds(state);
  return flat + share;
}

export const BASE_OFFLINE_CAP_HOURS = 8;
export const OFFLINE_EARNINGS_RATE = 0.5;

export function offlineCapHours(state: GameState): number {
  let bonus = 0;
  for (const id of ownedItemIds(state)) {
    const def = SHOP_ITEM_BY_ID[id];
    if (def?.effect.kind === 'offlineCapBonusHours') bonus += def.effect.value;
  }
  return BASE_OFFLINE_CAP_HOURS + bonus;
}

/**
 * Goo earned while the app was closed, capped and discounted.
 *
 * A running boost is credited only for the part of the offline window it
 * actually covered - buying an hour of double goo and then closing the app
 * should still pay out, but it must not silently double the entire window.
 */
export function computeOfflineEarnings(state: GameState, nowMs: number): OfflineResult {
  const elapsedMs = Math.max(0, nowMs - state.lastSavedAt);
  const capMs = offlineCapHours(state) * 60 * 60 * 1000;
  const cappedMs = Math.min(elapsedMs, capMs);

  const perSecond = rawGps(state) * baseGlobalMultiplier(state);
  const windowStart = nowMs - cappedMs;

  // Overlap between [windowStart, nowMs] and the boost's remaining life.
  const boostOverlapMs = Math.max(
    0,
    Math.min(nowMs, state.boostExpiresAt) - Math.max(windowStart, state.lastSavedAt)
  );
  const extraFromBoost =
    perSecond * (boostOverlapMs / 1000) * (state.boostMultiplier - 1) * OFFLINE_EARNINGS_RATE;

  const gooEarned = perSecond * (cappedMs / 1000) * OFFLINE_EARNINGS_RATE + Math.max(0, extraFromBoost);

  // Layered on top rather than folded in, so the returning-player summary can
  // show it as its own line and the two remain separately tunable.
  const bonus = welcomeBackBonus(gooEarned, elapsedMs);

  return { elapsedMs, cappedMs, gooEarned, welcomeBackBonus: bonus };
}

export function isSlimeUnlocked(def: SlimeDef, state: GameState): boolean {
  return state.lifetimeGoo >= def.unlockAtLifetimeGoo;
}

export interface NextSlimeUpgrade {
  index: number;
  requiredOwned: number;
  available: boolean;
}

/** The next per-slime production upgrade to purchase, or null if all are bought. */
export function nextSlimeUpgrade(owned: OwnedSlimeState): NextSlimeUpgrade | null {
  if (owned.upgradeLevels >= SLIME_UPGRADE_MILESTONES.length) return null;
  const requiredOwned = SLIME_UPGRADE_MILESTONES[owned.upgradeLevels];
  return { index: owned.upgradeLevels, requiredOwned, available: owned.count >= requiredOwned };
}

export function getSlimeDef(id: string): SlimeDef {
  const def = SLIME_BY_ID[id];
  if (!def) throw new Error(`Unknown slime id: ${id}`);
  return def;
}
