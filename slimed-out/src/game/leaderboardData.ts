/**
 * The local leaderboard's standing competitors.
 *
 * No backend, no network: these ten are the whole field, and the player is
 * ranked against them from their own save. That is the entire point of the
 * feature - a sense of standing without user accounts, a server, or anyone's
 * data leaving the device.
 *
 * These live in code rather than in the persisted save on purpose. They never
 * change during play, so persisting them would only bloat every save file and
 * freeze the roster at whatever shipped first - a later update could never
 * adjust a name or a score, because the stored copy would win on load. The one
 * thing here that *is* mutable, the player's own alias, is persisted (it reuses
 * `displayName`).
 *
 * If competitors ever need to grow over time - a "rivals creep upward while you
 * are away" mechanic - that is the point at which persistence starts earning
 * its keep, and this array becomes their starting snapshot.
 */

export interface CompetitorEntry {
  id: string;
  name: string;
  /** All-time goo earned. Mapped from the blueprint's `allTimeCash`. */
  allTimeGoo: number;
  slimeEssence: number;
}

export const COMPETITORS: CompetitorEntry[] = [
  { id: 'c_slimelord', name: 'SlimeLord99', allTimeGoo: 500_000_000, slimeEssence: 33_500 },
  { id: 'c_gigatapper', name: 'GigaTapper', allTimeGoo: 250_000_000, slimeEssence: 23_700 },
  { id: 'c_blobby', name: 'BlobbyMcBlob', allTimeGoo: 100_000_000, slimeEssence: 15_000 },
  { id: 'c_sticky', name: 'StickyFingers', allTimeGoo: 75_000_000, slimeEssence: 12_900 },
  { id: 'c_norsethfan', name: 'NorsethFan01', allTimeGoo: 40_000_000, slimeEssence: 9_400 },
  { id: 'c_glitchhunter', name: 'GlitchHunter', allTimeGoo: 15_000_000, slimeEssence: 5_800 },
  { id: 'c_cosmicgel', name: 'CosmicGel', allTimeGoo: 5_000_000, slimeEssence: 3_350 },
  { id: 'c_idlerider', name: 'IdleRider', allTimeGoo: 2_000_000, slimeEssence: 2_100 },
  { id: 'c_squishmaster', name: 'SquishMaster', allTimeGoo: 750_000, slimeEssence: 0 },
  { id: 'c_snail', name: 'A_Normal_Snail', allTimeGoo: 100_000, slimeEssence: 0 },
];

/** Identifies the player's own row in a ranked list. */
export const PLAYER_ROW_ID = 'player';

/** How many places the board shows before the player's row is pinned on. */
export const LEADERBOARD_SIZE = 10;
