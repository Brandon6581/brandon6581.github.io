import {
  ACHIEVEMENTS,
  ACHIEVEMENT_BY_ID,
  AchievementDef,
  AchievementPerk,
} from './achievementData';
import { GameState } from './types';

/**
 * Achievement evaluation and perk totals.
 *
 * This module must not import economy.ts. economy.ts reads `achievementPerks`
 * from here to build its multipliers, so an import back the other way would be
 * a runtime cycle and one of the two would be undefined at module init
 * depending on load order. Everything below therefore reads plain counters off
 * the state rather than any derived economy figure.
 */

export function achievementProgress(def: AchievementDef, state: GameState): number {
  return def.progress(state);
}

export function achievementComplete(def: AchievementDef, state: GameState): boolean {
  return def.progress(state) >= def.target;
}

export function isUnlocked(state: GameState, id: string): boolean {
  return state.unlockedAchievements.includes(id);
}

/**
 * Ids that have just become true and are not yet recorded. Returns an empty
 * array in the overwhelmingly common case, so the caller can skip the write.
 */
export function newlyUnlocked(state: GameState): string[] {
  const found: string[] = [];
  for (const def of ACHIEVEMENTS) {
    if (state.unlockedAchievements.includes(def.id)) continue;
    if (achievementComplete(def, state)) found.push(def.id);
  }
  return found;
}

/**
 * Standing bonuses from everything unlocked so far, as multipliers.
 *
 * These are permanent progression rather than a timed effect, so they belong in
 * the *base* multiplier alongside the collection milestone bonus - which means
 * they scale quest targets and quest rewards together, exactly as intended.
 */
export function achievementPerks(state: GameState): { production: number; tap: number } {
  let production = 1;
  let tap = 1;
  for (const id of state.unlockedAchievements) {
    const perk: AchievementPerk | undefined = ACHIEVEMENT_BY_ID[id]?.perk;
    if (!perk) continue;
    production += perk.production ?? 0;
    tap += perk.tap ?? 0;
  }
  return { production, tap };
}

export function unlockedCount(state: GameState): number {
  return ACHIEVEMENTS.filter((a) => state.unlockedAchievements.includes(a.id)).length;
}

/** Unlocked but not yet looked at, for the tab badge. */
export function unseenCount(state: GameState): number {
  return state.unlockedAchievements.filter((id) => !state.seenAchievements.includes(id)).length;
}

/** One line summarising a perk, or null when the achievement is pure bragging rights. */
export function describeAchievementPerk(def: AchievementDef): string | null {
  if (!def.perk) return null;
  const parts: string[] = [];
  if (def.perk.production) parts.push(`+${Math.round(def.perk.production * 100)}% goo production`);
  if (def.perk.tap) parts.push(`+${Math.round(def.perk.tap * 100)}% tap power`);
  return parts.length > 0 ? `Permanent: ${parts.join(', ')}` : null;
}
