import { ADD_ON_BY_ID } from './addOnData';
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

/** Bonus from purchased paid add-ons (small and optional by design). */
export function addOnGlobalMultiplier(state: GameState): number {
  let mult = 1;
  for (const id of state.purchasedAddOns) {
    const def = ADD_ON_BY_ID[id];
    if (def?.effect.kind === 'globalProductionMult') mult += def.effect.value;
  }
  return mult;
}

export function globalMultiplier(state: GameState): number {
  return globalMilestoneMultiplier(state) * addOnGlobalMultiplier(state);
}

/** Total goo produced per second across the whole collection. */
export function computeGps(state: GameState): number {
  const mult = globalMultiplier(state);
  let total = 0;
  for (const def of SLIMES) {
    const owned = state.slimes[def.id];
    if (!owned || owned.count <= 0) continue;
    total += owned.count * def.baseGps * slimeUpgradeMultiplier(owned.upgradeLevels) * mult;
  }
  return total;
}

/** Goo awarded for a single tap, including tap upgrades and global multipliers. */
export function computeTapValue(state: GameState): number {
  return state.tapPower * globalMultiplier(state);
}

export const BASE_OFFLINE_CAP_HOURS = 8;
export const OFFLINE_EARNINGS_RATE = 0.5;

export function offlineCapHours(state: GameState): number {
  let bonus = 0;
  for (const id of state.purchasedAddOns) {
    const def = ADD_ON_BY_ID[id];
    if (def?.effect.kind === 'offlineCapBonusHours') bonus += def.effect.value;
  }
  return BASE_OFFLINE_CAP_HOURS + bonus;
}

/** Computes goo earned while the app was closed/backgrounded, capped and discounted. */
export function computeOfflineEarnings(state: GameState, nowMs: number): OfflineResult {
  const elapsedMs = Math.max(0, nowMs - state.lastSavedAt);
  const capMs = offlineCapHours(state) * 60 * 60 * 1000;
  const cappedMs = Math.min(elapsedMs, capMs);
  const gps = computeGps(state);
  const gooEarned = gps * (cappedMs / 1000) * OFFLINE_EARNINGS_RATE;
  return { elapsedMs, cappedMs, gooEarned };
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
