import { SlimeLook } from '@/src/art/slimeLook';

/**
 * Collectible alternate looks for slimes already in the roster.
 *
 * A skin never changes a slime's numbers - it is purely something to own and
 * show off. Owning a skin applies it automatically; there is no equip step,
 * because the collection is the point rather than loadout management.
 */
export interface SlimeSkinDef {
  id: string;
  /** Which slime this re-skins. */
  slimeId: string;
  name: string;
  blurb: string;
  look: SlimeLook;
  /** True if it can also turn up during normal play, not only in the shop. */
  findable: boolean;
}

export const SLIME_SKINS: SlimeSkinDef[] = [
  {
    id: 'skin_golden',
    slimeId: 'basic',
    name: 'Golden Slime',
    blurb:
      'A rare golden variant of your very first slime. Owning it grants +10% production and +25% tap power. Turns up on its own now and then - or grab it here if you missed one.',
    look: { body: ['#FFE08A', '#C98A1E'], accent: '#FFF6D0', topper: 'crown' },
    findable: true,
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
