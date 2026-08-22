/**
 * Shop catalog.
 *
 * Design rule this list is built on: every paid item should carry some weight -
 * identity, ownership, collection, or genuine convenience. Things that are just
 * a different set of pixels behind the UI do not qualify, which is why
 * backdrops are free and chosen in Settings rather than sold here.
 *
 * The free upgrade tree remains completable without spending anything. Nothing
 * below gates progression; the timed boost only shortens a wait a player could
 * also simply sit through.
 */

export type ShopCategory =
  | 'identity'
  | 'convenience'
  | 'rare'
  | 'collection'
  | 'bundle'
  | 'soon';

export type ShopStatus = 'available' | 'comingSoon';

export type ShopEffect =
  /** Lets the player name the place their slimes live. */
  | { kind: 'unlockFarmName' }
  /** Lets the player set their own display name. */
  | { kind: 'unlockDisplayName' }
  /** Grants a collectible alternate look (see skinData.ts). */
  | { kind: 'skin'; skinId: string }
  /** Time-limited production multiplier. */
  | { kind: 'tempBoost'; multiplier: number; hours: number }
  /** Permanent flat percentage added to all production. */
  | { kind: 'globalProductionMult'; value: number }
  /** Extra hours on the offline earnings cap. */
  | { kind: 'offlineCapBonusHours'; value: number }
  /** Visual flourish with no mechanical effect. */
  | { kind: 'cosmetic' }
  /** One-time pack: goo plus a set of skins. */
  | { kind: 'bundle'; goo: number; skinIds: string[] }
  /** Placeholder entries that cannot be bought yet. */
  | { kind: 'none' };

export interface ShopItemDef {
  id: string;
  name: string;
  blurb: string;
  /** Null for Coming Soon entries. */
  price: number | null;
  category: ShopCategory;
  status: ShopStatus;
  /** Shown on Coming Soon rows to explain what it is waiting on. */
  note?: string;
  /** Boosts can be bought again; everything else is one-time. */
  repeatable?: boolean;
  effect: ShopEffect;
}

export const NO_ADS_PRICE = 0.99;

/** Section ordering in the shop - identity leads deliberately. */
export const CATEGORY_ORDER: ShopCategory[] = [
  'identity',
  'convenience',
  'rare',
  'collection',
  'bundle',
  'soon',
];

export const CATEGORY_LABELS: Record<ShopCategory, string> = {
  identity: 'Make it yours',
  convenience: 'Convenience',
  rare: 'Rare finds',
  collection: 'Collection',
  bundle: 'Bundle',
  soon: 'Coming soon',
};

export const CATEGORY_BLURBS: Record<ShopCategory, string> = {
  identity: 'Put your own name on the place and on yourself.',
  convenience: 'Shortcuts for time, never for progress.',
  rare: 'Unusual variants. These can also turn up on their own.',
  collection: 'Alternate looks and flourishes for people who like a full set.',
  bundle: 'A little of everything, cheaper than buying the parts.',
  soon: 'Planned for a future update.',
};

export const SHOP_ITEMS: ShopItemDef[] = [
  // ---- Identity and ownership ----
  {
    id: 'name_your_farm',
    name: 'Name Your Farm',
    blurb: 'Title the place your slimes live. Shown at the top of the Home screen.',
    price: 0.25,
    category: 'identity',
    status: 'available',
    effect: { kind: 'unlockFarmName' },
  },
  {
    id: 'custom_username',
    name: 'Choose Your Display Name',
    blurb: 'Set the name you go by instead of the default.',
    price: 0.25,
    category: 'identity',
    status: 'available',
    effect: { kind: 'unlockDisplayName' },
  },
  {
    id: 'founders_badge',
    name: "Founder's Badge",
    blurb: 'A supporter badge shown beside your name. Thanks for the early support.',
    price: 0.5,
    category: 'identity',
    status: 'available',
    effect: { kind: 'cosmetic' },
  },

  // ---- Convenience ----
  {
    id: 'boost_double_hour',
    name: 'Double Goo for an Hour',
    blurb:
      'Doubles all production for one hour of real time. Buy it again whenever you like; time stacks if one is still running.',
    price: 0.5,
    category: 'convenience',
    status: 'available',
    repeatable: true,
    effect: { kind: 'tempBoost', multiplier: 2, hours: 1 },
  },
  {
    id: 'offline_snooze_extender',
    name: 'Offline Snooze Extender',
    blurb: 'Adds 8 hours to your offline earnings cap, on top of the free 8.',
    price: 0.5,
    category: 'convenience',
    status: 'available',
    effect: { kind: 'offlineCapBonusHours', value: 8 },
  },
  {
    id: 'lucky_goo_charm',
    name: 'Lucky Goo Charm',
    blurb: 'A small permanent +5% to all goo production.',
    price: 0.5,
    category: 'convenience',
    status: 'available',
    effect: { kind: 'globalProductionMult', value: 0.05 },
  },

  // ---- Rare ----
  {
    id: 'skin_golden',
    name: 'Golden Slime',
    blurb:
      'A rare golden Basic Slime, and it earns its keep: +10% to all production and +25% tap power while you own it. It also shows up on its own once in a while - this is for anyone who never caught one.',
    price: 0.5,
    category: 'rare',
    status: 'available',
    effect: { kind: 'skin', skinId: 'skin_golden' },
  },

  // ---- Collection ----
  {
    id: 'skin_verdant_basic',
    name: 'Verdant Basic Slime',
    blurb: 'A deeper, mossier take on the slime you started with.',
    price: 0.25,
    category: 'collection',
    status: 'available',
    effect: { kind: 'skin', skinId: 'skin_verdant_basic' },
  },
  {
    id: 'skin_tidewalker_puddle',
    name: 'Tidewalker Puddle Slime',
    blurb: 'Storm-grey water with a bright crest.',
    price: 0.25,
    category: 'collection',
    status: 'available',
    effect: { kind: 'skin', skinId: 'skin_tidewalker_puddle' },
  },
  {
    id: 'skin_emberheart',
    name: 'Emberheart Ember Slime',
    blurb: 'Cooler on the outside, far brighter at the core.',
    price: 0.5,
    category: 'collection',
    status: 'available',
    effect: { kind: 'skin', skinId: 'skin_emberheart' },
  },
  {
    id: 'trail_wisp_glow',
    name: 'Tap Trail: Wisp Glow',
    blurb: 'A soft trailing glow follows your finger while you tap.',
    price: 0.25,
    category: 'collection',
    status: 'available',
    effect: { kind: 'cosmetic' },
  },
  {
    id: 'trail_cosmic_ooze',
    name: 'Tap Trail: Cosmic Ooze',
    blurb: 'A premium animated trail for your taps.',
    price: 0.5,
    category: 'collection',
    status: 'available',
    effect: { kind: 'cosmetic' },
  },

  // ---- Bundle ----
  {
    id: 'starter_pack',
    name: 'Starter Pack',
    blurb:
      'A goo headstart plus the Verdant Basic skin and the Wisp Glow trail. One time only.',
    price: 0.99,
    category: 'bundle',
    status: 'available',
    effect: {
      kind: 'bundle',
      goo: 25_000,
      skinIds: ['skin_verdant_basic'],
    },
  },

  // ---- Coming soon (visible, not purchasable) ----
  {
    id: 'gift_friend',
    name: 'Gift a Friend',
    blurb: 'Buy a cosmetic or a booster and send it to someone else.',
    price: null,
    category: 'soon',
    status: 'comingSoon',
    note: 'Planned for a future update.',
    effect: { kind: 'none' },
  },
  {
    id: 'more_farm_plots',
    name: 'More Farm Plots',
    blurb: 'Additional farms and a bigger layout to spread your collection across.',
    price: null,
    category: 'soon',
    status: 'comingSoon',
    note: 'Planned for a future update.',
    effect: { kind: 'none' },
  },
];

export const SHOP_ITEM_BY_ID: Record<string, ShopItemDef> = Object.fromEntries(
  SHOP_ITEMS.map((i) => [i.id, i])
);

/** Extra cosmetics the starter pack throws in that are not skins. */
export const STARTER_PACK_EXTRA_IDS = ['trail_wisp_glow'];

/** What the starter pack's contents would cost bought separately. */
export function starterPackSeparateValue(): number {
  return ['skin_verdant_basic', 'trail_wisp_glow'].reduce(
    (sum, id) => sum + (SHOP_ITEM_BY_ID[id]?.price ?? 0),
    0
  );
}
