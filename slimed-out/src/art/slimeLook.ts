/**
 * Visual vocabulary for the slime roster.
 *
 * Every slime shares one base silhouette (a soft, slightly drippy dome) and is
 * told apart by two things: a two-tone body palette that blends top-to-bottom,
 * and a topper. That keeps the cast readable at a glance in a list while still
 * letting each one feel like its own creature.
 */

/** Decorative feature sitting at the crown of the dome. */
export type TopperKind =
  | 'none'
  | 'horns'
  | 'fin'
  | 'crown'
  | 'spikes'
  | 'facets'
  | 'antenna'
  | 'petals'
  | 'coral'
  | 'halo'
  | 'ears'
  | 'flame';

/**
 * Three states, matching the three the design calls for:
 * - `asleep`  idle, at rest, nothing has happened for a while
 * - `roused`  awake and active, immediately after a tap
 * - `blink`   a brief closure while awake
 */
export type EyeState = 'asleep' | 'roused' | 'blink';

export interface SlimeLook {
  /** [top, bottom] of the body gradient. Deliberately two different hues so the
   *  blend reads as a gradient rather than a shaded single color. */
  body: [string, string];
  /** Topper tint - usually a harder, less translucent material than the body. */
  accent: string;
  topper: TopperKind;
}

/** Deterministic 0..1 from a string, so bubble placement is stable per slime. */
export function hashUnit(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}
