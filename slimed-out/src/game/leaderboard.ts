import {
  COMPETITORS,
  CompetitorEntry,
  LEADERBOARD_SIZE,
  PLAYER_ROW_ID,
} from './leaderboardData';

/**
 * Ranking for the local leaderboard.
 *
 * Computed on read rather than recalculated whenever the player's all-time goo
 * changes. That figure moves every single tick and on every tap, so subscribing
 * to it would re-sort an eleven-item list several times a second, all day, to
 * feed a screen that is usually not even open. Sorting eleven entries when the
 * board is actually rendered costs nothing and can never go stale.
 */

export interface RankedEntry extends CompetitorEntry {
  /** 1-based position across the whole field. */
  rank: number;
  isPlayer: boolean;
}

export interface PlayerSnapshot {
  name: string;
  allTimeGoo: number;
  slimeEssence: number;
}

/**
 * The full field, sorted by all-time goo descending and numbered from 1.
 *
 * Ties break on essence, then on name, so the order is stable rather than
 * dependent on sort implementation - a player sitting exactly level with a
 * competitor should not swap places on a re-render.
 */
export function rankAll(player: PlayerSnapshot): RankedEntry[] {
  const field: (CompetitorEntry & { isPlayer: boolean })[] = [
    ...COMPETITORS.map((c) => ({ ...c, isPlayer: false })),
    {
      id: PLAYER_ROW_ID,
      name: player.name,
      allTimeGoo: player.allTimeGoo,
      slimeEssence: player.slimeEssence,
      isPlayer: true,
    },
  ];

  field.sort((a, b) => {
    if (b.allTimeGoo !== a.allTimeGoo) return b.allTimeGoo - a.allTimeGoo;
    if (b.slimeEssence !== a.slimeEssence) return b.slimeEssence - a.slimeEssence;
    return a.name.localeCompare(b.name);
  });

  return field.map((entry, i) => ({ ...entry, rank: i + 1 }));
}

/** Where the player currently sits across the whole field. */
export function playerRank(player: PlayerSnapshot): number {
  return rankAll(player).find((e) => e.isPlayer)?.rank ?? COMPETITORS.length + 1;
}

/**
 * What the board renders: the top ten, plus the player's own row pinned on the
 * end when they have not broken into it yet.
 *
 * A plain top-ten slice would hide a new player from their own leaderboard -
 * the lowest competitor sits at 100,000 all-time goo, so anyone below that
 * simply would not appear, and the screen would read as broken rather than as
 * "you are not on the board yet". Pinning the row keeps their position and the
 * gap to tenth visible, which is the thing that makes a leaderboard motivating.
 */
export function leaderboardRows(player: PlayerSnapshot): RankedEntry[] {
  const all = rankAll(player);
  const top = all.slice(0, LEADERBOARD_SIZE);
  if (top.some((e) => e.isPlayer)) return top;

  const playerEntry = all.find((e) => e.isPlayer);
  return playerEntry ? [...top, playerEntry] : top;
}

/** All-time goo still needed to take the next place up. Zero when first. */
export function gooToNextRank(player: PlayerSnapshot): number {
  const all = rankAll(player);
  const index = all.findIndex((e) => e.isPlayer);
  if (index <= 0) return 0;
  return Math.max(0, all[index - 1].allTimeGoo - player.allTimeGoo + 1);
}
