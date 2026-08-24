/**
 * Tuning for the live-interaction features: the rare slime pop-in, the bonus
 * round, and the care mechanic.
 *
 * Every goo payout here is written in **seconds of the player's own
 * production** with a floor, for the same reason the daily rewards are (see
 * dailyData.ts): a fixed number is a real prize on day one and a rounding error
 * by mid-game. Cooldowns and durations stay in real time, because a minute
 * costs the player the same at every tier.
 */

// ---------------------------------------------------------------------------
// Rare slime pop-in
// ---------------------------------------------------------------------------

/**
 * The spawn engine checks once a minute rather than continuously, so the odds
 * below read as "per minute" and a player cannot farm checks by tabbing.
 */
export const SPAWN_CHECK_INTERVAL_MS = 60_000;
export const BASE_SPAWN_CHANCE = 0.1;
/**
 * Pity timer: after this long without a visitor, the next check is guaranteed.
 * Without it a run of bad luck can go a long while with nothing happening,
 * which reads as the feature being broken rather than as variance.
 */
export const PITY_THRESHOLD_MS = 15 * 60 * 1000;

/** Reward payouts get a small random wobble so the numbers feel less minted. */
export const REWARD_VARIANCE = 0.1;

export type VisitorReward =
  | { kind: 'currency'; seconds: number; floor: number }
  | { kind: 'frenzy'; multiplier: number; durationMs: number };

export interface RareVisitorDef {
  id: string;
  name: string;
  blurb: string;
  /** Relative draw weight within the pool. */
  weight: number;
  /** How long it stays on screen before wandering off. */
  durationMs: number;
  /** Ring and glow colour for the pop-in. */
  accent: string;
  reward: VisitorReward;
}

/**
 * The visitor pool. Rarer visitors pay more and linger less, so the best prize
 * is also the hardest to actually catch.
 *
 * Note the naming: the gilded visitor is deliberately NOT called "Golden
 * Slime". The collection already has a golden variant - a permanent collectible
 * skin with its own standing perk (see skinData.ts) - and giving a transient
 * currency event the same name would leave two unrelated things sharing one
 * word in the UI.
 */
export const RARE_VISITORS: RareVisitorDef[] = [
  {
    id: 'gilded',
    name: 'Gilded Slime',
    blurb: 'Ten minutes of production, gone in a blink.',
    weight: 70,
    durationMs: 25_000,
    accent: '#F5C451',
    reward: { kind: 'currency', seconds: 600, floor: 2_000 },
  },
  {
    id: 'glitch',
    name: 'Glitch Slime',
    blurb: 'Sends production haywire for a few minutes.',
    weight: 25,
    durationMs: 20_000,
    accent: '#5BE9E9',
    reward: { kind: 'frenzy', multiplier: 5, durationMs: 3 * 60 * 1000 },
  },
  {
    id: 'cosmic',
    name: 'Cosmic Slime',
    blurb: 'A full hour of production. Almost never seen.',
    weight: 5,
    durationMs: 15_000,
    accent: '#B57BEE',
    reward: { kind: 'currency', seconds: 3_600, floor: 12_000 },
  },
];

export const VISITOR_BY_ID: Record<string, RareVisitorDef> = Object.fromEntries(
  RARE_VISITORS.map((v) => [v.id, v])
);

export const TOTAL_VISITOR_WEIGHT = RARE_VISITORS.reduce((sum, v) => sum + v.weight, 0);

/** Seconds before a visitor leaves at which it starts blinking a warning. */
export const VISITOR_WARNING_MS = 5_000;

/**
 * A caught visitor can also leave the rare golden variant behind. This is a
 * second route to the same collectible the tap-find already grants - better
 * odds, but gated behind actually catching something.
 */
export const POP_IN_GOLDEN_CHANCE = 0.04;

// ---------------------------------------------------------------------------
// Bonus round
// ---------------------------------------------------------------------------

/** How often a free round becomes available. */
export const BONUS_ROUND_COOLDOWN_MS = 30 * 60 * 1000;
/** One full left-right-left sweep of the marker. */
export const BONUS_SWEEP_PERIOD_MS = 1_600;
/** Base payout before the accuracy multiplier. */
export const BONUS_BASE_SECONDS = 90;
export const BONUS_BASE_FLOOR = 400;

export interface BonusBand {
  /** Max distance from the centre of the bar, as a fraction of its width. */
  maxDistance: number;
  multiplier: number;
  label: string;
}

/**
 * Ordered tightest-first; the first band the stop lands in wins. The last band
 * is the catch-all, so a stop can never fail to score - a mistimed round pays
 * less than a good one but is never a total loss, which keeps the button worth
 * pressing.
 */
export const BONUS_BANDS: BonusBand[] = [
  { maxDistance: 0.03, multiplier: 5, label: 'Perfect!' },
  { maxDistance: 0.08, multiplier: 3, label: 'Great!' },
  { maxDistance: 0.16, multiplier: 2, label: 'Nice' },
  { maxDistance: 0.3, multiplier: 1, label: 'Okay' },
  { maxDistance: Infinity, multiplier: 0.5, label: 'Just missed' },
];

// ---------------------------------------------------------------------------
// Slime care
// ---------------------------------------------------------------------------

export interface CareActionDef {
  id: 'feed' | 'pet';
  label: string;
  /** Shown on the button while the action is on cooldown. */
  restingLabel: string;
  emoji: string;
  blurb: string;
  cooldownMs: number;
  durationMs: number;
  /** Added as a fraction: 0.25 = +25%. */
  productionBonus: number;
  tapBonus: number;
}

/**
 * Two actions on separate cooldowns so there is usually something to do, but
 * neither is large enough to be worth setting a timer for. Feeding pays the
 * idle curve, petting pays active tapping.
 */
export const CARE_ACTIONS: CareActionDef[] = [
  {
    id: 'feed',
    label: 'Feed',
    restingLabel: 'Full',
    emoji: '🍓',
    blurb: '+25% goo production for 30 minutes.',
    cooldownMs: 4 * 60 * 60 * 1000,
    durationMs: 30 * 60 * 1000,
    productionBonus: 0.25,
    tapBonus: 0,
  },
  {
    id: 'pet',
    label: 'Pet',
    restingLabel: 'Content',
    emoji: '🫧',
    blurb: '+50% tap power for 10 minutes.',
    cooldownMs: 45 * 60 * 1000,
    durationMs: 10 * 60 * 1000,
    productionBonus: 0,
    tapBonus: 0.5,
  },
];

export const CARE_BY_ID: Record<string, CareActionDef> = Object.fromEntries(
  CARE_ACTIONS.map((c) => [c.id, c])
);
