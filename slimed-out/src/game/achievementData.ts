import { SLIMES } from './slimeData';
import { GameState } from './types';
import { TAP_UPGRADES } from './upgradeData';

/**
 * Permanent milestones. Unlike quests these never reset and are never claimed -
 * they unlock the moment their condition is met and stay unlocked forever.
 *
 * Some carry a small standing perk. The perks are deliberately modest
 * individually and meaningful in aggregate (roughly +55% production and +45%
 * tap power for a complete set), because this is free progression: the brief
 * was that there should be a lot to earn without ever spending money, and this
 * is the long tail of that.
 *
 * Every achievement is `progress` over `target`, so the screen gets a progress
 * bar for free and the unlock rule is the same one line everywhere.
 */

export type AchievementCategory =
  | 'Tapping'
  | 'Collection'
  | 'Wealth'
  | 'Upgrades'
  | 'Events'
  | 'Devotion';

export interface AchievementPerk {
  production?: number;
  tap?: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: AchievementCategory;
  target: number;
  progress: (state: GameState) => number;
  perk?: AchievementPerk;
}

// --- small helpers, inlined rather than imported ---------------------------
// achievements must not import economy.ts: economy imports the perk totals from
// here, and a runtime cycle between the two would leave one of them undefined
// at module init depending on which Metro loads first.

const totalSlimes = (s: GameState) =>
  Object.values(s.slimes).reduce((sum, o) => sum + o.count, 0);

const distinctSlimes = (s: GameState) =>
  Object.values(s.slimes).filter((o) => o.count > 0).length;

const totalUpgradeLevels = (s: GameState) =>
  Object.values(s.slimes).reduce((sum, o) => sum + o.upgradeLevels, 0);

export const ACHIEVEMENTS: AchievementDef[] = [
  // ---- Tapping ----
  {
    id: 'tap_100',
    name: 'Sticky Fingers',
    description: 'Tap 100 times.',
    emoji: '👆',
    category: 'Tapping',
    target: 100,
    progress: (s) => s.totalTaps,
  },
  {
    id: 'tap_1k',
    name: 'Persistent',
    description: 'Tap 1,000 times.',
    emoji: '👆',
    category: 'Tapping',
    target: 1_000,
    progress: (s) => s.totalTaps,
    perk: { tap: 0.05 },
  },
  {
    id: 'tap_10k',
    name: 'Relentless',
    description: 'Tap 10,000 times.',
    emoji: '💥',
    category: 'Tapping',
    target: 10_000,
    progress: (s) => s.totalTaps,
    perk: { tap: 0.1 },
  },
  {
    id: 'tap_50k',
    name: 'Ruinous To Screens',
    description: 'Tap 50,000 times.',
    emoji: '🌋',
    category: 'Tapping',
    target: 50_000,
    progress: (s) => s.totalTaps,
    perk: { tap: 0.15 },
  },

  // ---- Collection ----
  {
    id: 'first_slime',
    name: 'First Resident',
    description: 'Take in your first slime.',
    emoji: '🟢',
    category: 'Collection',
    target: 1,
    progress: totalSlimes,
  },
  {
    id: 'slimes_25',
    name: 'A Proper Farm',
    description: 'Own 25 slimes in total.',
    emoji: '🏡',
    category: 'Collection',
    target: 25,
    progress: totalSlimes,
    perk: { production: 0.03 },
  },
  {
    id: 'slimes_100',
    name: 'Standing Room Only',
    description: 'Own 100 slimes in total.',
    emoji: '🏘️',
    category: 'Collection',
    target: 100,
    progress: totalSlimes,
    perk: { production: 0.05 },
  },
  {
    id: 'slimes_500',
    name: 'Slime Metropolis',
    description: 'Own 500 slimes in total.',
    emoji: '🌆',
    category: 'Collection',
    target: 500,
    progress: totalSlimes,
    perk: { production: 0.1 },
  },
  {
    id: 'variety_5',
    name: 'Mixed Company',
    description: 'Own 5 different kinds of slime.',
    emoji: '🎨',
    category: 'Collection',
    target: 5,
    progress: distinctSlimes,
  },
  {
    id: 'variety_12',
    name: 'Broad Tastes',
    description: 'Own 12 different kinds of slime.',
    emoji: '🖼️',
    category: 'Collection',
    target: 12,
    progress: distinctSlimes,
    perk: { production: 0.05 },
  },
  {
    id: 'variety_all',
    name: 'The Full Set',
    description: 'Own every kind of slime at once.',
    emoji: '🏆',
    category: 'Collection',
    // Derived, not hardcoded: adding a slime to the roster should raise the bar
    // rather than silently leave this completable with one missing.
    target: SLIMES.length,
    progress: distinctSlimes,
    perk: { production: 0.15, tap: 0.1 },
  },
  {
    id: 'skin_first',
    name: 'Something Special',
    description: 'Add your first alternate look to the collection.',
    emoji: '✨',
    category: 'Collection',
    target: 1,
    progress: (s) => s.ownedSkins.length,
  },

  // ---- Wealth ----
  {
    id: 'goo_10k',
    name: 'Pocket Change',
    description: 'Earn 10,000 goo in total.',
    emoji: '🫧',
    category: 'Wealth',
    target: 10_000,
    progress: (s) => s.lifetimeGoo,
  },
  {
    id: 'goo_1m',
    name: 'Comfortable',
    description: 'Earn 1 million goo in total.',
    emoji: '💧',
    category: 'Wealth',
    target: 1_000_000,
    progress: (s) => s.lifetimeGoo,
    perk: { production: 0.03 },
  },
  {
    id: 'goo_1b',
    name: 'Awash',
    description: 'Earn 1 billion goo in total.',
    emoji: '🌊',
    category: 'Wealth',
    target: 1_000_000_000,
    progress: (s) => s.lifetimeGoo,
    perk: { production: 0.06 },
  },
  {
    id: 'goo_1t',
    name: 'Drowning In It',
    description: 'Earn 1 trillion goo in total.',
    emoji: '🐋',
    category: 'Wealth',
    target: 1_000_000_000_000,
    progress: (s) => s.lifetimeGoo,
    perk: { production: 0.12 },
  },

  // ---- Upgrades ----
  {
    id: 'tap_upgrade_1',
    name: 'Sharpened',
    description: 'Buy your first tap upgrade.',
    emoji: '⚡',
    category: 'Upgrades',
    target: 1,
    progress: (s) => s.purchasedTapUpgrades.length,
  },
  {
    id: 'tap_upgrade_10',
    name: 'Well Equipped',
    description: 'Buy 10 tap upgrades.',
    emoji: '🔧',
    category: 'Upgrades',
    target: 10,
    progress: (s) => s.purchasedTapUpgrades.length,
    perk: { tap: 0.05 },
  },
  {
    id: 'tap_upgrade_all',
    name: 'Nothing Left To Buy',
    description: 'Buy every tap upgrade.',
    emoji: '🛠️',
    category: 'Upgrades',
    target: TAP_UPGRADES.length,
    progress: (s) => s.purchasedTapUpgrades.length,
    perk: { tap: 0.15 },
  },
  {
    id: 'slime_upgrade_10',
    name: 'Selective Breeding',
    description: 'Buy 10 per-slime production upgrades.',
    emoji: '🧬',
    category: 'Upgrades',
    target: 10,
    progress: totalUpgradeLevels,
    perk: { production: 0.04 },
  },
  {
    id: 'slime_upgrade_50',
    name: 'Master Cultivator',
    description: 'Buy 50 per-slime production upgrades.',
    emoji: '🌱',
    category: 'Upgrades',
    target: 50,
    progress: totalUpgradeLevels,
    perk: { production: 0.08 },
  },

  // ---- Events ----
  {
    id: 'popin_1',
    name: 'Quick Hands',
    description: 'Catch a visiting slime before it wanders off.',
    emoji: '🎯',
    category: 'Events',
    target: 1,
    progress: (s) => s.popInsCaught,
  },
  {
    id: 'popin_25',
    name: 'Never Misses',
    description: 'Catch 25 visiting slimes.',
    emoji: '🏹',
    category: 'Events',
    target: 25,
    progress: (s) => s.popInsCaught,
    perk: { tap: 0.1 },
  },
  {
    id: 'bonus_1',
    name: 'Feeling Lucky',
    description: 'Play a bonus round.',
    emoji: '🎡',
    category: 'Events',
    target: 1,
    progress: (s) => s.bonusRoundsPlayed,
  },
  {
    id: 'bonus_perfect',
    name: 'Dead Centre',
    description: 'Land a perfect stop in the bonus round.',
    emoji: '🎖️',
    category: 'Events',
    target: 5,
    progress: (s) => s.bestBonusMultiplier,
    perk: { production: 0.05, tap: 0.05 },
  },
  {
    id: 'care_10',
    name: 'Good Keeper',
    description: 'Feed or pet your slimes 10 times.',
    emoji: '💚',
    category: 'Events',
    target: 10,
    progress: (s) => s.timesFed + s.timesPetted,
    perk: { production: 0.04 },
  },
  {
    id: 'care_100',
    name: 'Devoted Keeper',
    description: 'Feed or pet your slimes 100 times.',
    emoji: '💞',
    category: 'Events',
    target: 100,
    progress: (s) => s.timesFed + s.timesPetted,
    perk: { production: 0.08 },
  },

  // ---- Devotion ----
  {
    id: 'streak_3',
    name: 'Getting Into It',
    description: 'Reach a 3 day login streak.',
    emoji: '📅',
    category: 'Devotion',
    target: 3,
    progress: (s) => s.streakDays,
  },
  {
    id: 'streak_7',
    name: 'A Full Week',
    description: 'Reach a 7 day login streak.',
    emoji: '🗓️',
    category: 'Devotion',
    target: 7,
    progress: (s) => s.streakDays,
    perk: { production: 0.05 },
  },
  {
    id: 'streak_30',
    name: 'Part Of The Routine',
    description: 'Reach a 30 day login streak.',
    emoji: '🎗️',
    category: 'Devotion',
    target: 30,
    progress: (s) => s.streakDays,
    perk: { production: 0.1, tap: 0.1 },
  },
];

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a])
);

export const ACHIEVEMENT_CATEGORIES: AchievementCategory[] = [
  'Tapping',
  'Collection',
  'Wealth',
  'Upgrades',
  'Events',
  'Devotion',
];
