import { AddOnDef } from './types';

// Optional paid add-ons. None of these are required to fully progress or
// "finish" the free upgrade tree - they're small cosmetics and modest,
// optional accelerators for players who want to support the game or skip
// a little grind. Every price is $0.25 or $0.50, one-time, no subscriptions.
export const ADD_ONS: AddOnDef[] = [
  // $0.25 - cosmetics
  {
    id: 'skin_golden_basic',
    name: 'Golden Basic Slime Skin',
    description: 'Give your very first slime a shiny golden look. Purely cosmetic.',
    price: 0.25,
    emoji: '🥇',
    effect: { kind: 'cosmetic' },
  },
  {
    id: 'trail_wisp_glow',
    name: 'Bog Wisp Glow Trail',
    description: 'A soft trailing glow follows your finger while you tap.',
    price: 0.25,
    emoji: '✨',
    effect: { kind: 'cosmetic' },
  },
  {
    id: 'theme_starlight',
    name: 'Starlight Background Theme',
    description: 'Swap the app background for a slow-drifting starfield.',
    price: 0.25,
    emoji: '🌌',
    effect: { kind: 'cosmetic' },
  },
  {
    id: 'sound_squelch_2',
    name: 'Squelch Pack Vol. 2',
    description: 'A second set of tap and purchase sound effects.',
    price: 0.25,
    emoji: '🔊',
    effect: { kind: 'cosmetic' },
  },
  {
    id: 'nicknames',
    name: 'Slime Nicknames',
    description: 'Give each slime in your collection a custom nickname.',
    price: 0.25,
    emoji: '🏷️',
    effect: { kind: 'cosmetic' },
  },
  // $0.50 - bigger cosmetics and small optional boosts
  {
    id: 'offline_snooze_extender',
    name: 'Offline Snooze Extender',
    description: 'Adds 8 extra hours to your offline earnings cap, on top of the free upgrades.',
    price: 0.5,
    emoji: '💤',
    effect: { kind: 'offlineCapBonusHours', value: 8 },
  },
  {
    id: 'lucky_goo_charm',
    name: 'Lucky Goo Charm',
    description: 'A small permanent +5% bonus to all goo production. Purely optional.',
    price: 0.5,
    emoji: '🍀',
    effect: { kind: 'globalProductionMult', value: 0.05 },
  },
  {
    id: 'trail_cosmic_ooze',
    name: 'Tap Trail: Cosmic Ooze',
    description: 'A premium animated tap trail for your finger taps.',
    price: 0.5,
    emoji: '🪐',
    effect: { kind: 'cosmetic' },
  },
  {
    id: 'golem_diorama',
    name: 'Golem Statue Diorama',
    description: 'A decorative trophy for your collection screen. Bragging rights only.',
    price: 0.5,
    emoji: '🏛️',
    effect: { kind: 'cosmetic' },
  },
  {
    id: 'founders_badge',
    name: "Founder's Badge",
    description: 'A cosmetic supporter badge shown on your Settings screen. Thanks for the support!',
    price: 0.5,
    emoji: '🎖️',
    effect: { kind: 'cosmetic' },
  },
];

export const ADD_ON_BY_ID: Record<string, AddOnDef> = Object.fromEntries(
  ADD_ONS.map((a) => [a.id, a])
);

export const NO_ADS_PRICE = 0.99;
