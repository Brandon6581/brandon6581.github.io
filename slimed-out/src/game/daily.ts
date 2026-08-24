import { steadyGps } from './economy';
import {
  DAILY_QUESTS,
  QuestDef,
  STREAK_REWARD_FLOOR,
  STREAK_REWARD_SECONDS,
  WEEKLY_CHALLENGES,
} from './dailyData';
import { GameState } from './types';

/**
 * Daily engagement logic: period boundaries, progress counters, streaks and
 * reward sizing. Pure functions only - the store owns the state.
 *
 * Periods use the device's LOCAL date, so "today" means what the player means
 * by it. That does make the clock the source of truth; for a single-player
 * offline game that is the right trade, but it is worth knowing that moving the
 * device clock forward can advance a period.
 */

export interface DailyCounters {
  taps: number;
  goo: number;
  upgrades: number;
  slimes: number;
}

export function emptyCounters(): DailyCounters {
  return { taps: 0, goo: 0, upgrades: 0, slimes: 0 };
}

/** Local calendar day, e.g. "2026-08-23". */
export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Local week, keyed by the Monday that starts it. */
export function weekKey(d: Date = new Date()): string {
  const monday = new Date(d);
  // getDay(): 0 = Sunday. Shift so Monday starts the week.
  const offset = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - offset);
  monday.setHours(0, 0, 0, 0);
  return `W${dayKey(monday)}`;
}

/** The day before the given key, for deciding whether a streak continues. */
export function previousDayKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  return dayKey(date);
}

/** Deterministic 32-bit hash, so a given date always draws the same quests. */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Three distinct quests for a day, stable for every session on that date. */
export function questsForDay(key: string): QuestDef[] {
  const pool = [...DAILY_QUESTS];
  const picked: QuestDef[] = [];
  let h = hash(key);
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    picked.push(pool.splice(h % pool.length, 1)[0]);
  }
  return picked;
}

export function challengeForWeek(key: string): QuestDef {
  return WEEKLY_CHALLENGES[hash(key) % WEEKLY_CHALLENGES.length];
}

/** Resolves a quest's target against the player's current production. */
export function questTarget(def: QuestDef, state: GameState): number {
  if (def.amount != null) return def.amount;
  const scaled = steadyGps(state) * (def.productionSeconds ?? 0);
  return Math.max(def.floor ?? 0, Math.ceil(scaled));
}

/** Resolves a quest's reward against the player's current production. */
export function questReward(def: QuestDef, state: GameState): number {
  return Math.max(def.rewardFloor, Math.ceil(steadyGps(state) * def.rewardSeconds));
}

export function counterFor(counters: DailyCounters, metric: QuestDef['metric']): number {
  return counters[metric];
}

export function questComplete(def: QuestDef, counters: DailyCounters, state: GameState): boolean {
  return counterFor(counters, def.metric) >= questTarget(def, state);
}

/** Goo granted for claiming a streak day. Day 1 is index 0. */
export function streakReward(streakDays: number, state: GameState): number {
  const idx = Math.min(Math.max(streakDays, 1), STREAK_REWARD_SECONDS.length) - 1;
  const seconds = STREAK_REWARD_SECONDS[idx];
  return Math.max(STREAK_REWARD_FLOOR, Math.ceil(steadyGps(state) * seconds));
}

/** What the streak becomes when claimed today, given the last claim. */
export function nextStreak(lastClaimDay: string, today: string): number | null {
  if (lastClaimDay === today) return null; // already claimed
  return lastClaimDay === previousDayKey(today) ? -1 : 1; // -1 = continue, 1 = restart
}

// `welcomeBackBonus` used to live here. It moved to offlineBonus.ts to break a
// cycle: economy.ts needed it, and this module needs economy.ts. See the note
// in that file before moving it back.

// ---------------------------------------------------------------------------
// Period state
// ---------------------------------------------------------------------------

export interface PeriodState {
  dailyKey: string;
  dailyCounters: DailyCounters;
  claimedQuestIds: string[];
  weeklyKey: string;
  weeklyCounters: DailyCounters;
  weeklyClaimed: boolean;
}

/**
 * Returns the patch needed to bring period state up to date, or null when
 * nothing has rolled over. Daily and weekly roll independently.
 */
export function rollPeriods(state: PeriodState, now: Date = new Date()): Partial<PeriodState> | null {
  const today = dayKey(now);
  const thisWeek = weekKey(now);
  const patch: Partial<PeriodState> = {};

  if (state.dailyKey !== today) {
    patch.dailyKey = today;
    patch.dailyCounters = emptyCounters();
    patch.claimedQuestIds = [];
  }

  if (state.weeklyKey !== thisWeek) {
    patch.weeklyKey = thisWeek;
    patch.weeklyCounters = emptyCounters();
    patch.weeklyClaimed = false;
  }

  return Object.keys(patch).length > 0 ? patch : null;
}

/** Adds progress to both the daily and weekly counters, rolling first. */
export function addProgress(
  state: PeriodState,
  delta: Partial<DailyCounters>,
  now: Date = new Date()
): Partial<PeriodState> {
  const rolled = rollPeriods(state, now);
  const daily = { ...(rolled?.dailyCounters ?? state.dailyCounters) };
  const weekly = { ...(rolled?.weeklyCounters ?? state.weeklyCounters) };

  for (const key of Object.keys(delta) as (keyof DailyCounters)[]) {
    const amount = delta[key] ?? 0;
    daily[key] += amount;
    weekly[key] += amount;
  }

  return { ...(rolled ?? {}), dailyCounters: daily, weeklyCounters: weekly };
}

/** How many rewards are ready to collect right now, for the Home badge. */
export function readyRewardCount(state: GameState, now: Date = new Date()): number {
  const today = dayKey(now);
  let count = state.lastStreakClaimDay === today ? 0 : 1;

  const dailyFresh = state.dailyKey === dayKey(now);
  const counters = dailyFresh ? state.dailyCounters : emptyCounters();
  for (const def of questsForDay(today)) {
    if (state.claimedQuestIds.includes(def.id)) continue;
    if (questComplete(def, counters, state)) count += 1;
  }

  const weeklyFresh = state.weeklyKey === weekKey(now);
  const weeklyCounters = weeklyFresh ? state.weeklyCounters : emptyCounters();
  if (!state.weeklyClaimed && questComplete(challengeForWeek(weekKey(now)), weeklyCounters, state)) {
    count += 1;
  }

  return count;
}
