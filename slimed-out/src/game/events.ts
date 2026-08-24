import {
  BASE_SPAWN_CHANCE,
  BONUS_BANDS,
  BONUS_SWEEP_PERIOD_MS,
  BonusBand,
  CARE_ACTIONS,
  CARE_BY_ID,
  CareActionDef,
  PITY_THRESHOLD_MS,
  RARE_VISITORS,
  REWARD_VARIANCE,
  RareVisitorDef,
  SPAWN_CHECK_INTERVAL_MS,
  TOTAL_VISITOR_WEIGHT,
  VISITOR_BY_ID,
  VISITOR_WARNING_MS,
} from './eventData';
import { SLIMES } from './slimeData';
import { GameState } from './types';

/**
 * Live-interaction logic: when a visitor shows up, how a bonus round scores,
 * and whether a care action is off cooldown.
 *
 * Pure functions only - the store owns the state and the screens own the
 * animation. Nothing here reads the clock on its own unless a caller declines
 * to pass one in, so every rule below is testable at a fixed instant.
 */

// ---------------------------------------------------------------------------
// Rare slime pop-in
// ---------------------------------------------------------------------------

export interface PopInState {
  /** Which roster slime is wearing the visitor look, or null when none. */
  popInSlimeId: string | null;
  /** Which rare visitor type is visiting. */
  visitorTypeId: string | null;
  popInExpiresAt: number;
  /** When the spawn engine last ran a check. */
  lastSpawnCheckAt: number;
  /** When a visitor last actually spawned, for the pity timer. */
  lastSpawnAt: number;
}

export function popInActive(state: PopInState, nowMs: number = Date.now()): boolean {
  return state.popInSlimeId != null && state.popInExpiresAt > nowMs;
}

export function visitorDef(state: PopInState): RareVisitorDef | null {
  return state.visitorTypeId ? (VISITOR_BY_ID[state.visitorTypeId] ?? null) : null;
}

/** Weighted draw across the visitor pool. */
export function rollVisitorType(roll: number = Math.random()): RareVisitorDef {
  let remaining = roll * TOTAL_VISITOR_WEIGHT;
  for (const def of RARE_VISITORS) {
    if (remaining < def.weight) return def;
    remaining -= def.weight;
  }
  return RARE_VISITORS[0];
}

/**
 * Which roster slime turns up wearing it. Drawn from what the player has
 * already unlocked, so a visitor is always someone recognisable, and weighted
 * towards the higher tiers they have reached for a bit of an occasion.
 */
export function pickPopInSlime(state: GameState, roll: number = Math.random()): string {
  const unlocked = SLIMES.filter((s) => state.lifetimeGoo >= s.unlockAtLifetimeGoo);
  const pool = unlocked.length > 0 ? unlocked : [SLIMES[0]];
  // Bias towards the end of the list (rarer tiers) without ever excluding the
  // early ones: squaring a uniform roll clusters it near the top.
  const index = Math.min(pool.length - 1, Math.floor(Math.sqrt(roll) * pool.length));
  return pool[index].id;
}

/** Cleared visitor fields, for when a window closes unclaimed. */
const CLEARED = { popInSlimeId: null, visitorTypeId: null, popInExpiresAt: 0 };

/**
 * The spawn engine. Runs at most once per SPAWN_CHECK_INTERVAL_MS and returns
 * the patch to apply, or null to leave things alone.
 *
 * Two rules decide a spawn: a flat per-check chance, and a pity timer that
 * forces one once it has been too long. Both the check clock and the pity clock
 * live in persisted state rather than module scope, so a reload cannot reset
 * them and a player cannot re-roll by restarting the app.
 */
export function rollPopIn(state: GameState, nowMs: number = Date.now()): Partial<PopInState> | null {
  if (popInActive(state, nowMs)) return null;

  // A window that closed without a tap: clear it whatever else happens.
  const stale = state.popInSlimeId != null ? CLEARED : null;

  if (nowMs - state.lastSpawnCheckAt < SPAWN_CHECK_INTERVAL_MS) return stale;

  const duePity = nowMs - state.lastSpawnAt >= PITY_THRESHOLD_MS;
  if (!duePity && Math.random() >= BASE_SPAWN_CHANCE) {
    return { ...stale, lastSpawnCheckAt: nowMs };
  }

  const def = rollVisitorType();
  return {
    popInSlimeId: pickPopInSlime(state),
    visitorTypeId: def.id,
    popInExpiresAt: nowMs + def.durationMs,
    lastSpawnCheckAt: nowMs,
    lastSpawnAt: nowMs,
  };
}

/** Fraction of the visitor's window still remaining, 1 down to 0. */
export function popInTimeLeft(state: PopInState, nowMs: number = Date.now()): number {
  const def = visitorDef(state);
  if (!def || !popInActive(state, nowMs)) return 0;
  return Math.max(0, Math.min(1, (state.popInExpiresAt - nowMs) / def.durationMs));
}

/** True once the visitor is close enough to leaving to warrant a warning blink. */
export function popInLeavingSoon(state: PopInState, nowMs: number = Date.now()): boolean {
  return popInActive(state, nowMs) && state.popInExpiresAt - nowMs <= VISITOR_WARNING_MS;
}

/**
 * A small random wobble applied to a payout, so the number the player sees
 * varies run to run instead of being the same minted figure every time.
 */
export function rewardVariance(roll: number = Math.random()): number {
  return 1 - REWARD_VARIANCE + roll * REWARD_VARIANCE * 2;
}

// ---------------------------------------------------------------------------
// Bonus round
// ---------------------------------------------------------------------------

/**
 * Marker position at a given point in a sweep, as 0..1 across the bar.
 *
 * A triangle wave, so the marker travels out and back like a pendulum rather
 * than snapping from one end to the other. The screen animates from this same
 * function, which is what keeps what the player sees and what the tap scores
 * from ever drifting apart.
 */
export function sweepPosition(elapsedMs: number): number {
  const phase = (elapsedMs % BONUS_SWEEP_PERIOD_MS) / BONUS_SWEEP_PERIOD_MS;
  return phase < 0.5 ? phase * 2 : 2 - phase * 2;
}

/** The band a stop lands in. Never null - the last band catches everything. */
export function bandForPosition(position: number): BonusBand {
  const distance = Math.abs(position - 0.5);
  return BONUS_BANDS.find((b) => distance <= b.maxDistance) ?? BONUS_BANDS[BONUS_BANDS.length - 1];
}

export function bonusRoundReady(state: { nextBonusRoundAt: number }, nowMs: number = Date.now()) {
  return nowMs >= state.nextBonusRoundAt;
}

export function bonusRoundWaitMs(state: { nextBonusRoundAt: number }, nowMs: number = Date.now()) {
  return Math.max(0, state.nextBonusRoundAt - nowMs);
}

// ---------------------------------------------------------------------------
// Slime care
// ---------------------------------------------------------------------------

export interface CareState {
  lastFedAt: number;
  lastPettedAt: number;
}

export function lastCareAt(state: CareState, id: CareActionDef['id']): number {
  return id === 'feed' ? state.lastFedAt : state.lastPettedAt;
}

export function careReady(
  state: CareState,
  id: CareActionDef['id'],
  nowMs: number = Date.now()
): boolean {
  const def = CARE_BY_ID[id];
  return nowMs - lastCareAt(state, id) >= def.cooldownMs;
}

export function careCooldownLeftMs(
  state: CareState,
  id: CareActionDef['id'],
  nowMs: number = Date.now()
): number {
  const def = CARE_BY_ID[id];
  return Math.max(0, lastCareAt(state, id) + def.cooldownMs - nowMs);
}

/** True while the buff from a care action is still running. */
export function careBuffActive(
  state: CareState,
  id: CareActionDef['id'],
  nowMs: number = Date.now()
): boolean {
  const def = CARE_BY_ID[id];
  const at = lastCareAt(state, id);
  return at > 0 && nowMs < at + def.durationMs;
}

export function careBuffLeftMs(
  state: CareState,
  id: CareActionDef['id'],
  nowMs: number = Date.now()
): number {
  const def = CARE_BY_ID[id];
  const at = lastCareAt(state, id);
  return at > 0 ? Math.max(0, at + def.durationMs - nowMs) : 0;
}

/** When a care buff ends, or 0 if it was never started. */
export function careBuffExpiresAt(state: CareState, id: CareActionDef['id']): number {
  const at = lastCareAt(state, id);
  return at > 0 ? at + CARE_BY_ID[id].durationMs : 0;
}

/** Combined care contribution, as multipliers. Both are 1 when nothing is running. */
export function careMultipliers(
  state: CareState,
  nowMs: number = Date.now()
): { production: number; tap: number } {
  let production = 1;
  let tap = 1;
  for (const def of CARE_ACTIONS) {
    if (!careBuffActive(state, def.id, nowMs)) continue;
    production += def.productionBonus;
    tap += def.tapBonus;
  }
  return { production, tap };
}

/** True when any care action is off cooldown, for the home-screen prompt. */
export function anyCareReady(state: CareState, nowMs: number = Date.now()): boolean {
  return CARE_ACTIONS.some((def) => careReady(state, def.id, nowMs));
}
