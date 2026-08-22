import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { ADD_ON_BY_ID } from './addOnData';
import { DEFAULT_BACKDROP_ID } from './backgroundData';
import {
  computeGps,
  computeOfflineEarnings,
  computeTapValue,
  costForNextSlime,
  costForSlimeUpgrade,
  nextSlimeUpgrade,
} from './economy';
import { SLIME_BY_ID } from './slimeData';
import { TAP_UPGRADES } from './upgradeData';
import { GameState, OwnedSlimeState, OfflineResult } from './types';

const SAVE_KEY = 'slimed-out/save/v1';
/** Below this gap we don't bother showing an offline-earnings popup. */
const MIN_OFFLINE_GAP_MS = 60_000;

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
  };
}

function getOwnedSlime(state: GameState, id: string): OwnedSlimeState {
  return state.slimes[id] ?? { count: 0, upgradeLevels: 0 };
}

interface GameActions {
  tap: () => number;
  tick: (deltaSeconds: number) => void;
  buySlime: (id: string) => boolean;
  buySlimeUpgrade: (id: string) => boolean;
  buyTapUpgrade: (id: string) => boolean;
  grantAddOn: (id: string) => void;
  grantNoAds: () => void;
  restoreEntitlements: (addOnIds: string[], noAds: boolean) => void;
  claimOfflineEarnings: () => OfflineResult | null;
  markAdShown: () => void;
  toggleSound: () => void;
  setBackdrop: (id: string) => void;
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
        set({
          goo: state.goo + value,
          lifetimeGoo: state.lifetimeGoo + value,
          totalTaps: state.totalTaps + 1,
        });
        return value;
      },

      tick: (deltaSeconds: number) => {
        if (deltaSeconds <= 0) return;
        const state = get();
        const gps = computeGps(state);
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

      grantAddOn: (id: string) => {
        const state = get();
        if (!ADD_ON_BY_ID[id]) return;
        if (state.purchasedAddOns.includes(id)) return;
        set({ purchasedAddOns: [...state.purchasedAddOns, id] });
      },

      grantNoAds: () => set({ noAdsPurchased: true }),

      restoreEntitlements: (addOnIds: string[], noAds: boolean) => {
        const state = get();
        const merged = Array.from(new Set([...state.purchasedAddOns, ...addOnIds]));
        set({ purchasedAddOns: merged, noAdsPurchased: state.noAdsPurchased || noAds });
      },

      claimOfflineEarnings: () => {
        const state = get();
        const t = now();
        const result = computeOfflineEarnings(state, t);
        set({ lastSavedAt: t });
        if (result.elapsedMs < MIN_OFFLINE_GAP_MS || result.gooEarned <= 0) return null;
        set((s) => ({ goo: s.goo + result.gooEarned, lifetimeGoo: s.lifetimeGoo + result.gooEarned }));
        return result;
      },

      markAdShown: () => set({ lastAdShownAt: now() }),

      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),

      setBackdrop: (id: string) => set({ selectedBackdropId: id }),

      resetProgress: () => set({ ...initialState() }),

      touchSave: () => set({ lastSavedAt: now() }),
    }),
    {
      name: SAVE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      // v1 saves predate backdrop selection. Persist merges shallowly, so a
      // missing key would already fall back to the initial value - this just
      // makes the intent explicit and gives later migrations a place to live.
      migrate: (persisted, fromVersion) => {
        const state = persisted as Partial<GameState>;
        if (fromVersion < 2 && !state.selectedBackdropId) {
          return { ...state, selectedBackdropId: DEFAULT_BACKDROP_ID };
        }
        return state;
      },
    }
  )
);
