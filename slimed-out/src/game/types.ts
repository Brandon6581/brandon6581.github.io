// Core data shapes for Slimed Out!

import { SlimeLook } from '@/src/art/slimeLook';

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
}
