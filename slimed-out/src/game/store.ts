import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DEFAULT_BACKDROP_ID } from './backgroundData';
import {
  computeOfflineEarnings,
  computeTapValue,
  costForNextSlime,
  costForSlimeUpgrade,
  nextSlimeUpgrade,
  rawGps,
  globalMultiplier,
} from './economy';
import { GOLDEN_FIND_CHANCE, GOLDEN_FIND_MIN_TAPS, GOLDEN_SKIN_ID } from './skinData';
import { SHOP_ITEM_BY_ID, STARTER_PACK_EXTRA_IDS } from './shopData';
import { SLIME_BY_ID } from './slimeData';
import { TAP_UPGRADES } from './upgradeData';
import { GameState, OwnedSlimeState, OfflineResult } from './types';

const SAVE_KEY = 'slimed-out/save/v1';
/** Below this gap we don't bother showing an offline-earnings popup. */
const MIN_OFFLINE_GAP_MS = 60_000;

export const DEFAULT_FARM_NAME = 'The Slime Patch';
export const DEFAULT_DISPLAY_NAME = 'Slime Keeper';
export const MAX_NAME_LENGTH = 24;

function now() {
  return Date.now();
}

function initialState(): GameState {
  const t = now();
  return {
    goo: 0,
    lifetimeGoo: 0,
    totalTaps: 0,
    tapPower: 1,
    slimes: { basic: { count: 0, upgradeLevels: 0 } },
    purchasedTapUpgrades: [],
    purchasedAddOns: [],
    noAdsPurchased: false,
    lastSavedAt: t,
    createdAt: t,
    lastAdShownAt: 0,
    soundEnabled: true,
    selectedBackdropId: DEFAULT_BACKDROP_ID,
    farmName: DEFAULT_FARM_NAME,
    displayName: DEFAULT_DISPLAY_NAME,
    ownedSkins: [],
    boostExpiresAt: 0,
    boostMultiplier: 2,
  };
}

function getOwnedSlime(state: GameState, id: string): OwnedSlimeState {
  return state.slimes[id] ?? { count: 0, upgradeLevels: 0 };
}

/** Trims and clamps a player-supplied name, falling back when it's empty. */
export function sanitizeName(input: string, fallback: string): string {
  const trimmed = input.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH);
  return trimmed.length > 0 ? trimmed : fallback;
}

export interface TapResult {
  value: number;
  /** Set when this tap happened to turn up the rare golden variant. */
  foundSkinId?: string;
}

interface GameActions {
  tap: () => TapResult;
  tick: (deltaSeconds: number) => void;
  buySlime: (id: string) => boolean;
  buySlimeUpgrade: (id: string) => boolean;
  buyTapUpgrade: (id: string) => boolean;
  applyShopItem: (id: string) => void;
  grantNoAds: () => void;
  restoreEntitlements: (itemIds: string[], noAds: boolean) => void;
  claimOfflineEarnings: () => OfflineResult | null;
  markAdShown: () => void;
  toggleSound: () => void;
  setBackdrop: (id: string) => void;
  setFarmName: (name: string) => void;
  setDisplayName: (name: string) => void;
  resetProgress: () => void;
  touchSave: () => void;
}

export type GameStore = GameState & GameActions;

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialState(),

      tap: () => {
        const state = get();
        const value = computeTapValue(state);
        const totalTaps = state.totalTaps + 1;

        // The rare variant can turn up on its own, but only once the player
        // has a collection worth adding to - and never twice.
        let foundSkinId: string | undefined;
        if (
          totalTaps >= GOLDEN_FIND_MIN_TAPS &&
          !state.ownedSkins.includes(GOLDEN_SKIN_ID) &&
          Math.random() < GOLDEN_FIND_CHANCE
        ) {
          foundSkinId = GOLDEN_SKIN_ID;
        }

        set({
          goo: state.goo + value,
          lifetimeGoo: state.lifetimeGoo + value,
          totalTaps,
          ...(foundSkinId ? { ownedSkins: [...state.ownedSkins, foundSkinId] } : null),
        });

        return { value, foundSkinId };
      },

      tick: (deltaSeconds: number) => {
        if (deltaSeconds <= 0) return;
        const state = get();
        const gps = rawGps(state) * globalMultiplier(state);
        if (gps <= 0) return;
        const earned = gps * deltaSeconds;
        set({ goo: state.goo + earned, lifetimeGoo: state.lifetimeGoo + earned });
      },

      buySlime: (id: string) => {
        const state = get();
        const def = SLIME_BY_ID[id];
        if (!def) return false;
        const owned = getOwnedSlime(state, id);
        const cost = costForNextSlime(def, owned.count);
        if (state.goo < cost) return false;
        set({
          goo: state.goo - cost,
          slimes: { ...state.slimes, [id]: { ...owned, count: owned.count + 1 } },
        });
        return true;
      },

      buySlimeUpgrade: (id: string) => {
        const state = get();
        const def = SLIME_BY_ID[id];
        if (!def) return false;
        const owned = getOwnedSlime(state, id);
        const upgrade = nextSlimeUpgrade(owned);
        if (!upgrade || !upgrade.available) return false;
        const cost = costForSlimeUpgrade(def, upgrade.index);
        if (state.goo < cost) return false;
        set({
          goo: state.goo - cost,
          slimes: {
            ...state.slimes,
            [id]: { ...owned, upgradeLevels: owned.upgradeLevels + 1 },
          },
        });
        return true;
      },

      buyTapUpgrade: (id: string) => {
        const state = get();
        const def = TAP_UPGRADES.find((u) => u.id === id);
        if (!def) return false;
        if (state.purchasedTapUpgrades.includes(id)) return false;
        if (state.goo < def.cost) return false;
        set({
          goo: state.goo - def.cost,
          tapPower: state.tapPower + def.addPower,
          purchasedTapUpgrades: [...state.purchasedTapUpgrades, id],
        });
        return true;
      },

      /** Applies a purchased shop item's effect. Safe to call more than once. */
      applyShopItem: (id: string) => {
        const state = get();
        const def = SHOP_ITEM_BY_ID[id];
        if (!def || def.status !== 'available') return;

        const owned = new Set(state.purchasedAddOns);
        const skins = new Set(state.ownedSkins);
        const patch: Partial<GameState> = {};

        switch (def.effect.kind) {
          case 'skin':
            skins.add(def.effect.skinId);
            break;

          case 'tempBoost': {
            // Stack onto whatever is left rather than truncating it.
            const from = Math.max(now(), state.boostExpiresAt);
            patch.boostExpiresAt = from + def.effect.hours * 60 * 60 * 1000;
            patch.boostMultiplier = def.effect.multiplier;
            break;
          }

          case 'bundle': {
            patch.goo = state.goo + def.effect.goo;
            patch.lifetimeGoo = state.lifetimeGoo + def.effect.goo;
            def.effect.skinIds.forEach((s) => skins.add(s));
            STARTER_PACK_EXTRA_IDS.forEach((extra) => owned.add(extra));
            break;
          }

          // unlockFarmName / unlockDisplayName / globalProductionMult /
          // offlineCapBonusHours / cosmetic are all read straight off
          // purchasedAddOns, so recording ownership is the whole effect.
          default:
            break;
        }

        owned.add(id);
        set({ ...patch, purchasedAddOns: [...owned], ownedSkins: [...skins] });
      },

      grantNoAds: () => set({ noAdsPurchased: true }),

      restoreEntitlements: (itemIds: string[], noAds: boolean) => {
        if (noAds) set({ noAdsPurchased: true });
        // Re-applying is safe: applyShopItem is idempotent for everything
        // except the timed boost, which is consumable and never restored.
        itemIds
          .filter((id) => SHOP_ITEM_BY_ID[id]?.effect.kind !== 'tempBoost')
          .forEach((id) => get().applyShopItem(id));
      },

      claimOfflineEarnings: () => {
        const state = get();
        const t = now();
        const result = computeOfflineEarnings(state, t);
        set({ lastSavedAt: t });
        if (result.elapsedMs < MIN_OFFLINE_GAP_MS || result.gooEarned <= 0) return null;
        set((s) => ({
          goo: s.goo + result.gooEarned,
          lifetimeGoo: s.lifetimeGoo + result.gooEarned,
        }));
        return result;
      },

      markAdShown: () => set({ lastAdShownAt: now() }),

      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),

      setBackdrop: (id: string) => set({ selectedBackdropId: id }),

      setFarmName: (name: string) => {
        if (!get().purchasedAddOns.includes('name_your_farm')) return;
        set({ farmName: sanitizeName(name, DEFAULT_FARM_NAME) });
      },

      setDisplayName: (name: string) => {
        if (!get().purchasedAddOns.includes('custom_username')) return;
        set({ displayName: sanitizeName(name, DEFAULT_DISPLAY_NAME) });
      },

      resetProgress: () => {
        // Progress resets; paid entitlements and the names attached to them do not.
        const s = get();
        set({
          ...initialState(),
          purchasedAddOns: s.purchasedAddOns,
          ownedSkins: s.ownedSkins,
          noAdsPurchased: s.noAdsPurchased,
          farmName: s.farmName,
          displayName: s.displayName,
          selectedBackdropId: s.selectedBackdropId,
        });
      },

      touchSave: () => set({ lastSavedAt: now() }),
    }),
    {
      name: SAVE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      version: 3,
      migrate: (persisted, fromVersion) => {
        const state = persisted as Partial<GameState>;
        const patched: Partial<GameState> = { ...state };

        if (fromVersion < 2 && !patched.selectedBackdropId) {
          patched.selectedBackdropId = DEFAULT_BACKDROP_ID;
        }

        if (fromVersion < 3) {
          // v2 sold backdrops and a few items that no longer exist. Drop the
          // retired ids so they can't linger as unknown entitlements, and seed
          // the identity/collection/boost fields.
          const retired = new Set([
            'theme_starlight',
            'nicknames',
            'sound_squelch_2',
            'golem_diorama',
            'skin_golden_basic',
          ]);
          patched.purchasedAddOns = (patched.purchasedAddOns ?? []).filter((id) => !retired.has(id));
          patched.farmName ??= DEFAULT_FARM_NAME;
          patched.displayName ??= DEFAULT_DISPLAY_NAME;
          patched.ownedSkins ??= [];
          patched.boostExpiresAt ??= 0;
          patched.boostMultiplier ??= 2;
        }

        return patched;
      },
    }
  )
);
