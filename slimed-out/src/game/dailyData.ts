/**
 * Daily quests and the weekly challenge.
 *
 * Targets and rewards that involve goo are expressed in **seconds of the
 * player's own production** rather than fixed amounts. A flat "earn 10,000 goo"
 * is a real task on day one and a rounding error by the time a collection is
 * running - the same mistake that made flat tap power feel worthless. Count
 * based goals (taps, purchases) stay fixed, because those cost the same effort
 * at every tier.
 *
 * Each entry carries a `floor` so the early game, where production is near
 * zero, still gets a sensible number.
 */

export type QuestMetric = 'taps' | 'goo' | 'upgrades' | 'slimes';

export interface QuestDef {
  id: string;
  metric: QuestMetric;
  /** Fixed target, for count-style metrics. */
  amount?: number;
  /** Goo target as seconds of current production. */
  productionSeconds?: number;
  /** Minimum target, so early game is not trivially complete. */
  floor?: number;
  /** `{target}` is substituted with the resolved, formatted number. */
  label: string;
  /** Reward as seconds of current production. */
  rewardSeconds: number;
  /** Minimum reward. */
  rewardFloor: number;
}

/** Daily pool. Three are drawn per day, deterministically from the date. */
export const DAILY_QUESTS: QuestDef[] = [
  {
    id: 'q_tap_500',
    metric: 'taps',
    amount: 500,
    label: 'Tap {target} times',
    rewardSeconds: 90,
    rewardFloor: 250,
  },
  {
    id: 'q_tap_150',
    metric: 'taps',
    amount: 150,
    label: 'Tap {target} times',
    rewardSeconds: 45,
    rewardFloor: 120,
  },
  {
    id: 'q_earn_goo',
    metric: 'goo',
    productionSeconds: 240,
    floor: 10_000,
    label: 'Earn {target} goo',
    rewardSeconds: 120,
    rewardFloor: 400,
  },
  {
    id: 'q_earn_goo_big',
    metric: 'goo',
    productionSeconds: 600,
    floor: 50_000,
    label: 'Earn {target} goo',
    rewardSeconds: 200,
    rewardFloor: 800,
  },
  {
    id: 'q_buy_upgrade',
    metric: 'upgrades',
    amount: 1,
    label: 'Buy {target} upgrade',
    rewardSeconds: 100,
    rewardFloor: 300,
  },
  {
    id: 'q_buy_upgrades_3',
    metric: 'upgrades',
    amount: 3,
    label: 'Buy {target} upgrades',
    rewardSeconds: 180,
    rewardFloor: 600,
  },
  {
    id: 'q_buy_slimes_5',
    metric: 'slimes',
    amount: 5,
    label: 'Take in {target} slimes',
    rewardSeconds: 110,
    rewardFloor: 350,
  },
  {
    id: 'q_buy_slimes_15',
    metric: 'slimes',
    amount: 15,
    label: 'Take in {target} slimes',
    rewardSeconds: 200,
    rewardFloor: 700,
  },
];

/** Weekly pool. One is drawn per week, and pays considerably more. */
export const WEEKLY_CHALLENGES: QuestDef[] = [
  {
    id: 'w_tap_5000',
    metric: 'taps',
    amount: 5_000,
    label: 'Tap {target} times this week',
    rewardSeconds: 1_800,
    rewardFloor: 25_000,
  },
  {
    id: 'w_earn_goo',
    metric: 'goo',
    productionSeconds: 7_200,
    floor: 1_000_000,
    label: 'Earn {target} goo this week',
    rewardSeconds: 1_800,
    rewardFloor: 25_000,
  },
  {
    id: 'w_buy_slimes_60',
    metric: 'slimes',
    amount: 60,
    label: 'Take in {target} slimes this week',
    rewardSeconds: 2_100,
    rewardFloor: 30_000,
  },
  {
    id: 'w_buy_upgrades_12',
    metric: 'upgrades',
    amount: 12,
    label: 'Buy {target} upgrades this week',
    rewardSeconds: 2_100,
    rewardFloor: 30_000,
  },
];

/**
 * Streak rewards, in seconds of production. Escalating across a seven day run,
 * then holding at the day-seven value so a long streak stays worth keeping
 * without growing without bound.
 */
export const STREAK_REWARD_SECONDS = [60, 120, 210, 330, 480, 700, 1_000];
export const STREAK_REWARD_FLOOR = 200;

/** Extra goo per hour away, as a fraction of the offline earnings, and its cap. */
export const WELCOME_BACK_PER_HOUR = 0.1;
export const WELCOME_BACK_MAX = 1;
/** Below this, returning is not really "coming back" and no bonus is given. */
export const WELCOME_BACK_MIN_AWAY_MS = 30 * 60 * 1000;
