/**
 * Backdrop variants.
 *
 * The app never shows a flat color: `grove` is the free default and is a real
 * illustrated scene. Everything here is data, so adding a variant is one entry
 * plus (optionally) a new silhouette shape in Backdrop.tsx - no screen changes.
 *
 * Every backdrop is free. Backdrops are a display preference rather than
 * something with real ownership weight, so they are chosen in Settings and are
 * not sold in the shop. `unlockedBy` stays in the model - it costs nothing and
 * leaves the door open for a genuinely special backdrop later - but nothing
 * sets it today.
 */

export type BackdropShape = 'canopy' | 'hills' | 'stalactites' | 'horizon';
export type MoteStyle = 'dust' | 'bubbles' | 'stars' | 'sparks';

export interface BackdropDef {
  id: string;
  name: string;
  blurb: string;
  /** Vertical sky gradient, top to bottom. */
  sky: [string, string, string];
  /** Soft light source bloom: color plus position in 0..1 of the viewport. */
  glow: { color: string; x: number; y: number };
  /** Three parallax-style silhouette bands, far to near. */
  bands: [string, string, string];
  shape: BackdropShape;
  motes: MoteStyle;
  moteColor: string;
  unlockedBy: string | null;
}

export const BACKDROPS: BackdropDef[] = [
  {
    id: 'grove',
    name: 'Mossy Grove',
    blurb: 'Filtered light through a damp forest canopy. The default home of every slime.',
    sky: ['#254A3A', '#1B3A2E', '#122A22'],
    glow: { color: '#BFE39A', x: 0.68, y: 0.2 },
    bands: ['#1E4032', '#173327', '#10251D'],
    shape: 'canopy',
    motes: 'dust',
    moteColor: '#D8F0B4',
    unlockedBy: null,
  },
  {
    id: 'tidepool',
    name: 'Tidepool Shallows',
    blurb: 'Cool water light and drifting bubbles along a sheltered coast.',
    sky: ['#1C4C5E', '#153B4C', '#0E2A37'],
    glow: { color: '#9FE0E8', x: 0.35, y: 0.16 },
    bands: ['#17414F', '#123440', '#0C2531'],
    shape: 'horizon',
    motes: 'bubbles',
    moteColor: '#BFEFF5',
    unlockedBy: null,
  },
  {
    id: 'cavern',
    name: 'Geode Cavern',
    blurb: 'Deep stone, faceted walls, and the faint glow of buried crystal.',
    sky: ['#3A2C55', '#2B2142', '#1B1630'],
    glow: { color: '#C6A6F0', x: 0.5, y: 0.24 },
    bands: ['#33264C', '#281D3C', '#1B1430'],
    shape: 'stalactites',
    motes: 'sparks',
    moteColor: '#DDC4FF',
    unlockedBy: null,
  },
  {
    id: 'starlight',
    name: 'Starlight',
    blurb: 'A slow, high, open night sky. Best with the lights off.',
    sky: ['#1B2350', '#141A3C', '#0C1028'],
    glow: { color: '#A9B8FF', x: 0.24, y: 0.18 },
    bands: ['#182047', '#121838', '#0B1028'],
    shape: 'hills',
    motes: 'stars',
    moteColor: '#EAF0FF',
    unlockedBy: null,
  },
];

export const DEFAULT_BACKDROP_ID = 'grove';

export const BACKDROP_BY_ID: Record<string, BackdropDef> = Object.fromEntries(
  BACKDROPS.map((b) => [b.id, b])
);

export function isBackdropUnlocked(def: BackdropDef, purchasedAddOns: string[]): boolean {
  return def.unlockedBy === null || purchasedAddOns.includes(def.unlockedBy);
}

/** Falls back to the free default if the saved id is unknown or no longer owned. */
export function resolveBackdrop(id: string | undefined, purchasedAddOns: string[]): BackdropDef {
  const def = id ? BACKDROP_BY_ID[id] : undefined;
  if (def && isBackdropUnlocked(def, purchasedAddOns)) return def;
  return BACKDROP_BY_ID[DEFAULT_BACKDROP_ID];
}
