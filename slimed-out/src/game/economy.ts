import { achievementPerks } from './achievements';
import { ownedItemIds, ownedSkinIds } from './entitlements';
import { welcomeBackBonus } from './offlineBonus';
import {
  BONUS_BASE_FLOOR,
  BONUS_BASE_SECONDS,
  CARE_ACTIONS,
  RareVisitorDef,
} from './eventData';
import { careBuffActive, careBuffExpiresAt, careMultipliers } from './events';
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
 * A production multiplier that runs out. The paid boost and the care buffs are
 * both of this shape, and offline earnings credit each one only for the slice
 * of the window it actually covered.
 */
export interface TimedBuff {
  expiresAt: number;
  multiplier: number;
}

export function isFrenzyActive(state: GameState, nowMs: number = Date.now()): boolean {
  return state.frenzyExpiresAt > nowMs;
}

/** Frenzy multiplier from a caught Glitch Slime, or 1 when none is running. */
export function frenzyMultiplier(state: GameState, nowMs: number = Date.now()): number {
  return isFrenzyActive(state, nowMs) ? state.frenzyMultiplier : 1;
}

/** Every timed production buff currently running. */
export function activeTimedBuffs(state: GameState, nowMs: number = Date.now()): TimedBuff[] {
  const buffs: TimedBuff[] = [];
  if (isBoostActive(state, nowMs)) {
    buffs.push({ expiresAt: state.boostExpiresAt, multiplier: state.boostMultiplier });
  }
  if (isFrenzyActive(state, nowMs)) {
    buffs.push({ expiresAt: state.frenzyExpiresAt, multiplier: state.frenzyMultiplier });
  }
  for (const def of CARE_ACTIONS) {
    if (def.productionBonus <= 0) continue;
    if (!careBuffActive(state, def.id, nowMs)) continue;
    buffs.push({ expiresAt: careBuffExpiresAt(state, def.id), multiplier: 1 + def.productionBonus });
  }
  return buffs;
}

/** Combined temporary multiplier: paid boost, frenzy and any care buff. */
export function temporaryMultiplier(state: GameState, nowMs: number = Date.now()): number {
  return (
    boostMultiplier(state, nowMs) *
    frenzyMultiplier(state, nowMs) *
    careMultipliers(state, nowMs).production
  );
}

/**
 * Everything that scales production *permanently*: collection milestones, paid
 * standing bonuses, collectible perks and unlocked achievements.
 *
 * Timed effects are deliberately excluded. Two things depend on that: offline
 * earnings need the steady rate so a buff can be credited only for the slice of
 * time it was actually running, and daily quest targets and rewards are sized
 * off this so that drinking a boost cannot inflate what a quest pays.
 */
export function baseGlobalMultiplier(state: GameState): number {
  return (
    globalMilestoneMultiplier(state) *
    shopGlobalMultiplier(state) *
    skinGlobalMultiplier(state) *
    achievementPerks(state).production
  );
}

/** Full multiplier including any running boost. Use for live play and display. */
export function globalMultiplier(state: GameState, nowMs: number = Date.now()): number {
  return baseGlobalMultiplier(state) * temporaryMultiplier(state, nowMs);
}

/**
 * Production per second excluding every timed buff - the stable baseline.
 *
 * This is the figure every scaled reward is sized against (daily quests,
 * streaks, pop-ins, bonus rounds), which is what stops a running boost from
 * inflating what those hand out.
 */
export function steadyGps(state: GameState): number {
  return rawGps(state) * baseGlobalMultiplier(state);
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
  const tapPerks =
    skinPerkMultipliers(state).tap *
    achievementPerks(state).tap *
    careMultipliers(state, nowMs).tap;
  const flat = state.tapPower * tapPerks * globalMultiplier(state, nowMs);
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
 * A running timed buff is credited only for the part of the offline window it
 * actually covered - buying an hour of double goo and then closing the app
 * should still pay out, but it must not silently double the entire window. The
 * paid boost and any care buff are handled identically here; adding another
 * timed buff means adding it to `activeTimedBuffs` and nothing else.
 */
export function computeOfflineEarnings(state: GameState, nowMs: number): OfflineResult {
  const elapsedMs = Math.max(0, nowMs - state.lastSavedAt);
  const capMs = offlineCapHours(state) * 60 * 60 * 1000;
  const cappedMs = Math.min(elapsedMs, capMs);

  const perSecond = rawGps(state) * baseGlobalMultiplier(state);
  const windowStart = nowMs - cappedMs;

  // Each buff earns its extra only across the overlap between the credited
  // window [windowStart, nowMs] and the buff's own remaining life.
  let extraFromBuffs = 0;
  for (const buff of activeTimedBuffs(state, state.lastSavedAt)) {
    const overlapMs = Math.max(
      0,
      Math.min(nowMs, buff.expiresAt) - Math.max(windowStart, state.lastSavedAt)
    );
    extraFromBuffs += perSecond * (overlapMs / 1000) * (buff.multiplier - 1) * OFFLINE_EARNINGS_RATE;
  }

  const gooEarned = perSecond * (cappedMs / 1000) * OFFLINE_EARNINGS_RATE + Math.max(0, extraFromBuffs);

  // Layered on top rather than folded in, so the returning-player summary can
  // show it as its own line and the two remain separately tunable.
  const bonus = welcomeBackBonus(gooEarned, elapsedMs);

  return { elapsedMs, cappedMs, gooEarned, welcomeBackBonus: bonus };
}

/**
 * Payouts for the live-interaction events, sized in seconds of steady
 * production with a floor - the same rule the daily rewards follow, so none of
 * them decays into a rounding error as a collection grows.
 */
export function popInReward(state: GameState, def: RareVisitorDef, variance = 1): number {
  if (def.reward.kind !== 'currency') return 0;
  const scaled = steadyGps(state) * def.reward.seconds * variance;
  return Math.max(Math.ceil(def.reward.floor * variance), Math.ceil(scaled));
}

/** Base payout of a bonus round, before the accuracy multiplier is applied. */
export function bonusRoundBase(state: GameState): number {
  return Math.max(BONUS_BASE_FLOOR, Math.ceil(steadyGps(state) * BONUS_BASE_SECONDS));
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
