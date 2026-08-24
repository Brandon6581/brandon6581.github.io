import { SlimeLook } from '@/src/art/slimeLook';

/**
 * Collectible alternate looks for slimes already in the roster.
 *
 * A skin never changes a slime's numbers - it is purely something to own and
 * show off. Owning a skin applies it automatically; there is no equip step,
 * because the collection is the point rather than loadout management.
 */
/**
 * A standing bonus granted for as long as the skin is in the collection.
 * Expressed as fractions (0.1 = +10%).
 */
export interface SkinPerk {
  production: number;
  tap: number;
}

export interface SlimeSkinDef {
  id: string;
  /** Which slime this re-skins. */
  slimeId: string;
  name: string;
  blurb: string;
  look: SlimeLook;
  /** True if it can also turn up during normal play, not only in the shop. */
  findable: boolean;
  /** Standing bonus while owned. Most skins are purely cosmetic and omit this. */
  perk?: SkinPerk;
}

/** One sentence describing a perk, framed as a collection-ownership benefit. */
export function describePerk(skin: SlimeSkinDef): string | null {
  if (!skin.perk) return null;
  return (
    `While the ${skin.name} is in your collection, you gain ` +
    `+${Math.round(skin.perk.production * 100)}% goo production and ` +
    `+${Math.round(skin.perk.tap * 100)}% tap power.`
  );
}

export const SLIME_SKINS: SlimeSkinDef[] = [
  {
    id: 'skin_golden',
    slimeId: 'basic',
    name: 'Golden Slime',
    blurb:
      'A rare golden variant of your very first slime. While it is in your collection you gain +10% goo production and +25% tap power. Turns up on its own now and then - or grab it here if you missed one.',
    look: { body: ['#FFE08A', '#C98A1E'], accent: '#FFF6D0', topper: 'crown' },
    findable: true,
    perk: { production: 0.1, tap: 0.25 },
  },
  {
    id: 'skin_verdant_basic',
    slimeId: 'basic',
    name: 'Verdant Basic Slime',
    blurb: 'A deeper, mossier take on the original. For collectors who started here.',
    look: { body: ['#7FD48F', '#255F45'], accent: '#B8EFC4', topper: 'petals' },
    findable: false,
  },
  {
    id: 'skin_tidewalker_puddle',
    slimeId: 'puddle',
    name: 'Tidewalker Puddle Slime',
    blurb: 'Storm-grey water with a bright crest. Rarely seen this far inland.',
    look: { body: ['#A9C6E8', '#25415F'], accent: '#DCEBFA', topper: 'fin' },
    findable: false,
  },
  {
    id: 'skin_emberheart',
    slimeId: 'ember',
    name: 'Emberheart Ember Slime',
    blurb: 'Burns cooler on the outside and far brighter at the core.',
    look: { body: ['#FF9F6B', '#7A1F2B'], accent: '#FFD9A0', topper: 'flame' },
    findable: false,
  },
  {
    // Granted by the CYBER_GLITCH redemption code. Not sold and not findable,
    // so the code is the only way to hold it.
    id: 'skin_neon_glitch',
    slimeId: 'crystal',
    name: 'Neon Glitch Crystal Slime',
    blurb: 'Refracts a colour that is not quite in the spectrum. Came through a code.',
    look: { body: ['#5BE9E9', '#2B1F6B'], accent: '#FF6BE9', topper: 'antenna' },
    findable: false,
  },
];

export const SKIN_BY_ID: Record<string, SlimeSkinDef> = Object.fromEntries(
  SLIME_SKINS.map((s) => [s.id, s])
);

/** The rare variant that can be stumbled on during play. */
export const GOLDEN_SKIN_ID = 'skin_golden';

/**
 * Chance per tap of finding the golden variant, once the player is far enough
 * in to have a collection worth adding to. Tuned to be a pleasant surprise
 * over a few sessions rather than something to grind for.
 */
export const GOLDEN_FIND_CHANCE = 1 / 1500;
export const GOLDEN_FIND_MIN_TAPS = 150;

/** Owned skins win over the slime's default look. */
export function resolveLook(slimeId: string, defaultLook: SlimeLook, ownedSkins: string[]): SlimeLook {
  for (const skinId of ownedSkins) {
    const skin = SKIN_BY_ID[skinId];
    if (skin && skin.slimeId === slimeId) return skin.look;
  }
  return defaultLook;
}
