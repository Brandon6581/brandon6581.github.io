// Core data shapes for Slimed Out!

import { SlimeLook } from '@/src/art/slimeLook';

import { DailyCounters } from './daily';

export interface SlimeDef {
  id: string;
  name: string;
  tier: number;
  /** In-app flavor text shown on the slime's card. */
  flavor: string;
  /** Optional short attribution shown under folklore-inspired slimes. */
  originNote?: string;
  /** Cost of the first unit; each subsequent unit costs baseCost * costGrowth^owned. */
  baseCost: number;
  costGrowth: number;
  /** Goo produced per second, per owned unit, before multipliers. */
  baseGps: number;
  /** Lifetime goo earned required before this slime appears in the shop. */
  unlockAtLifetimeGoo: number;
  /** Palette and topper driving the painterly sprite. */
  look: SlimeLook;
}

/** Owned-count milestones at which a slime's per-unit production upgrade becomes available. */
export const SLIME_UPGRADE_MILESTONES = [1, 5, 10, 25, 50, 100, 150, 200] as const;

export interface TapUpgradeDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  /** Flat goo added to every tap. */
  addPower: number;
  /** Lifetime goo earned required before this upgrade appears. */
  unlockAtLifetimeGoo: number;
  emoji: string;
}

export type AddOnPriceTier = 0.25 | 0.5;

export interface AddOnDef {
  id: string;
  name: string;
  description: string;
  price: AddOnPriceTier;
  emoji: string;
  /** Small, optional, non-essential effect. Never required for full progression. */
  effect:
    | { kind: 'cosmetic' }
    | { kind: 'globalProductionMult'; value: number }
    | { kind: 'offlineCapBonusHours'; value: number };
}

export interface IAPProductDef {
  id: string;
  name: string;
  description: string;
  price: number;
  kind: 'noAds' | 'addOn';
}

export interface OwnedSlimeState {
  count: number;
  /** Indices into SLIME_UPGRADE_MILESTONES that have been purchased. */
  upgradeLevels: number;
}

export interface OfflineResult {
  elapsedMs: number;
  cappedMs: number;
  gooEarned: number;
  /** Extra granted for time away, on top of `gooEarned`. */
  welcomeBackBonus: number;
}

export interface GameState {
  goo: number;
  lifetimeGoo: number;
  totalTaps: number;
  tapPower: number;
  slimes: Record<string, OwnedSlimeState>;
  purchasedTapUpgrades: string[];
  purchasedAddOns: string[];
  noAdsPurchased: boolean;
  lastSavedAt: number;
  createdAt: number;
  lastAdShownAt: number;
  soundEnabled: boolean;
  /** Vibration on taps and rewards. Ignored where there is no motor. */
  hapticsEnabled: boolean;
  /**
   * Daily streak reminder. Off by default: notification permission is asked for
   * only when the player turns this on, never on first launch.
   */
  remindersEnabled: boolean;
  /** Chosen backdrop variant id; falls back to the free default when unset. */
  selectedBackdropId: string;

  // ---- Identity ----
  /** What the player calls their farm. Editable once `name_your_farm` is owned. */
  farmName: string;
  /** The player's display name. Editable once `custom_username` is owned. */
  displayName: string;

  // ---- Collection ----
  /** Skin ids the player owns, whether bought or found during play. */
  ownedSkins: string[];

  // ---- Convenience ----
  /** Epoch ms when the temporary production boost ends; 0 when inactive. */
  boostExpiresAt: number;
  /** Multiplier applied while the boost is running. */
  boostMultiplier: number;

  // ---- Daily engagement ----
  /** Consecutive days claimed. 0 before the first claim. */
  streakDays: number;
  /** Day key of the last streak claim; '' when never claimed. */
  lastStreakClaimDay: string;
  /** Day the daily counters belong to; they reset when it changes. */
  dailyKey: string;
  dailyCounters: DailyCounters;
  /** Quest ids already claimed within the current day. */
  claimedQuestIds: string[];
  /** Week the weekly counters belong to. */
  weeklyKey: string;
  weeklyCounters: DailyCounters;
  weeklyClaimed: boolean;

  // ---- Live events ----
  /** Which roster slime is wearing the visitor look, or null when none. */
  popInSlimeId: string | null;
  /** Which entry of RARE_VISITORS is visiting. */
  visitorTypeId: string | null;
  /** When the current visitor leaves. */
  popInExpiresAt: number;
  /** When the spawn engine last ran a check. Persisted so a reload cannot re-roll. */
  lastSpawnCheckAt: number;
  /** When a visitor last spawned, driving the pity timer. */
  lastSpawnAt: number;
  popInsCaught: number;

  /** Frenzy buff from a caught Glitch Slime. */
  frenzyExpiresAt: number;
  frenzyMultiplier: number;

  /** When the next free bonus round unlocks. */
  nextBonusRoundAt: number;
  bonusRoundsPlayed: number;
  /** Best accuracy multiplier ever landed, for the achievement. */
  bestBonusMultiplier: number;

  /** Care timestamps. Cooldown and buff duration both derive from these. */
  lastFedAt: number;
  lastPettedAt: number;
  timesFed: number;
  timesPetted: number;

  // ---- Ascension (prestige) ----
  /**
   * Essence held. Survives ascension, and will be spendable on the skill tree.
   * The blueprint calls this the non-volatile side of the loop.
   */
  slimeEssence: number;
  /**
   * Essence ever awarded, which is not the same as essence held once the skill
   * tree can spend it. This is what the award calculation subtracts against, so
   * repeated ascensions pay only the increment since the last one.
   */
  lifetimeEssenceEarned: number;
  /** How many times the player has ascended. */
  ascensionCount: number;

  // ---- Social ----
  /**
   * Redemption codes already claimed, stored normalised (uppercase). Each code
   * pays once; this is the whole guard against re-entering one.
   */
  redeemedCodes: string[];

  // ---- Achievements ----
  /** Permanently unlocked achievement ids. Never cleared. */
  unlockedAchievements: string[];
  /** Which of those the player has actually looked at, for the tab badge. */
  seenAchievements: string[];

  /** First-run flow finished (studio splash -> welcome -> naming -> how to play). */
  onboardingComplete: boolean;
  /** Each player gets one free naming; further changes need the shop item. */
  freeFarmNameUsed: boolean;
  freeDisplayNameUsed: boolean;

  /**
   * Developer testing mode. Persisted so testing survives a reload, but it
   * only has any effect when the build-time gate in src/dev/devMode.ts allows
   * it - a release build ignores this flag entirely.
   */
  devModeEnabled: boolean;
}
