import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DEV_GOO_GRANT } from '@/src/dev/devMode';

import { DEFAULT_BACKDROP_ID } from './backgroundData';
import {
  addProgress,
  challengeForWeek,
  dayKey,
  emptyCounters,
  questComplete,
  questReward,
  questsForDay,
  previousDayKey,
  rollPeriods,
  streakReward,
  weekKey,
} from './daily';
import { newlyUnlocked } from './achievements';
import { ownsItem } from './entitlements';
import {
  bonusRoundBase,
  computeOfflineEarnings,
  computeTapValue,
  costForNextSlime,
  costForSlimeUpgrade,
  nextSlimeUpgrade,
  popInReward,
  rawGps,
  globalMultiplier,
} from './economy';
import { BONUS_ROUND_COOLDOWN_MS, CareActionDef, POP_IN_GOLDEN_CHANCE } from './eventData';
import {
  bandForPosition,
  bonusRoundReady,
  careReady,
  popInActive,
  rewardVariance,
  rollPopIn,
  visitorDef,
} from './events';
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
    popInSlimeId: null,
    visitorTypeId: null,
    popInExpiresAt: 0,
    // Both clocks start now, so the first check is a minute out and the pity
    // timer does not immediately fire on a brand new save.
    lastSpawnCheckAt: t,
    lastSpawnAt: t,
    popInsCaught: 0,
    frenzyExpiresAt: 0,
    frenzyMultiplier: 1,
    // The first bonus round is available immediately - it doubles as the
    // tutorial for the mechanic.
    nextBonusRoundAt: 0,
    bonusRoundsPlayed: 0,
    bestBonusMultiplier: 0,
    lastFedAt: 0,
    lastPettedAt: 0,
    timesFed: 0,
    timesPetted: 0,
    unlockedAchievements: [],
    seenAchievements: [],
    streakDays: 0,
    lastStreakClaimDay: '',
    dailyKey: dayKey(),
    dailyCounters: emptyCounters(),
    claimedQuestIds: [],
    weeklyKey: weekKey(),
    weeklyCounters: emptyCounters(),
    weeklyClaimed: false,
    onboardingComplete: false,
    freeFarmNameUsed: false,
    freeDisplayNameUsed: false,
    devModeEnabled: false,
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

export interface CatchResult {
  visitorId: string;
  /** Currency pays goo directly; frenzy starts a timed production buff. */
  kind: 'currency' | 'frenzy';
  reward: number;
  foundSkinId?: string;
}

export interface BonusResult {
  reward: number;
  multiplier: number;
  label: string;
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
  claimStreak: () => number | null;
  claimQuest: (questId: string) => number | null;
  claimWeekly: () => number | null;
  refreshPeriods: () => void;
  catchPopIn: () => CatchResult | null;
  playBonusRound: (position: number) => BonusResult | null;
  careFor: (id: CareActionDef['id']) => boolean;
  syncAchievements: () => void;
  markAchievementsSeen: () => void;
  completeOnboarding: (farmName: string, displayName: string) => void;
  canRenameFarm: () => boolean;
  canRenameSelf: () => boolean;
  setDevMode: (enabled: boolean) => void;
  toggleDevMode: () => void;
  grantDevGoo: () => void;
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
          ...addProgress(state, { taps: 1, goo: value }),
          ...(foundSkinId ? { ownedSkins: [...state.ownedSkins, foundSkinId] } : null),
        });

        return { value, foundSkinId };
      },

      tick: (deltaSeconds: number) => {
        if (deltaSeconds <= 0) return;
        const state = get();
        const gps = rawGps(state) * globalMultiplier(state);
        const earned = gps > 0 ? gps * deltaSeconds : 0;

        // The visitor schedule and the achievement sweep both ride the tick, so
        // they keep running even for a player who has not bought a slime yet.
        const popIn = rollPopIn(state);

        if (earned > 0 || popIn) {
          set({
            ...(earned > 0
              ? {
                  goo: state.goo + earned,
                  lifetimeGoo: state.lifetimeGoo + earned,
                  ...addProgress(state, { goo: earned }),
                }
              : null),
            ...(popIn ?? null),
          });
        }

        get().syncAchievements();
      },

      /**
       * Records anything that has just come true. Cheap enough to run on every
       * tick: it is a handful of counter comparisons and writes nothing in the
       * overwhelmingly common case where nothing changed.
       */
      syncAchievements: () => {
        const found = newlyUnlocked(get());
        if (found.length === 0) return;
        set((s) => ({ unlockedAchievements: [...s.unlockedAchievements, ...found] }));
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
          ...addProgress(state, { slimes: 1 }),
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
          ...addProgress(state, { upgrades: 1 }),
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
          ...addProgress(state, { upgrades: 1 }),
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
        const total = result.gooEarned + result.welcomeBackBonus;
        set((s) => ({ goo: s.goo + total, lifetimeGoo: s.lifetimeGoo + total }));
        return result;
      },

      markAdShown: () => set({ lastAdShownAt: now() }),

      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),

      setBackdrop: (id: string) => set({ selectedBackdropId: id }),

      /**
       * Naming is allowed when the player owns the shop item OR still has
       * their one free change. Using the free one consumes it, so the shop
       * item is what buys *repeat* changes rather than the first one.
       */
      canRenameFarm: () => {
        const s = get();
        return ownsItem(s, 'name_your_farm') || !s.freeFarmNameUsed;
      },

      canRenameSelf: () => {
        const s = get();
        return ownsItem(s, 'custom_username') || !s.freeDisplayNameUsed;
      },

      setFarmName: (name: string) => {
        const s = get();
        if (!get().canRenameFarm()) return;
        const usedFree = !ownsItem(s, 'name_your_farm');
        set({
          farmName: sanitizeName(name, DEFAULT_FARM_NAME),
          ...(usedFree ? { freeFarmNameUsed: true } : null),
        });
      },

      setDisplayName: (name: string) => {
        const s = get();
        if (!get().canRenameSelf()) return;
        const usedFree = !ownsItem(s, 'custom_username');
        set({
          displayName: sanitizeName(name, DEFAULT_DISPLAY_NAME),
          ...(usedFree ? { freeDisplayNameUsed: true } : null),
        });
      },

      /** Rolls daily/weekly counters if the period changed. Safe to call often. */
      refreshPeriods: () => {
        const patch = rollPeriods(get());
        if (patch) set(patch);
      },

      /**
       * Claims today's streak day. Returns the goo granted, or null when today
       * has already been claimed.
       */
      claimStreak: () => {
        get().refreshPeriods();
        const state = get();
        const today = dayKey();
        if (state.lastStreakClaimDay === today) return null;

        // Yesterday continues the run; anything older starts a new one.
        const continues = state.lastStreakClaimDay === previousDayKey(today);
        const streakDays = continues ? state.streakDays + 1 : 1;
        const reward = streakReward(streakDays, state);

        set({
          streakDays,
          lastStreakClaimDay: today,
          goo: state.goo + reward,
          lifetimeGoo: state.lifetimeGoo + reward,
        });
        return reward;
      },

      claimQuest: (questId: string) => {
        get().refreshPeriods();
        const state = get();
        const def = questsForDay(state.dailyKey).find((q) => q.id === questId);
        if (!def) return null;
        if (state.claimedQuestIds.includes(questId)) return null;
        if (!questComplete(def, state.dailyCounters, state)) return null;

        const reward = questReward(def, state);
        set({
          claimedQuestIds: [...state.claimedQuestIds, questId],
          goo: state.goo + reward,
          lifetimeGoo: state.lifetimeGoo + reward,
        });
        return reward;
      },

      claimWeekly: () => {
        get().refreshPeriods();
        const state = get();
        if (state.weeklyClaimed) return null;
        const def = challengeForWeek(state.weeklyKey);
        if (!questComplete(def, state.weeklyCounters, state)) return null;

        const reward = questReward(def, state);
        set({
          weeklyClaimed: true,
          goo: state.goo + reward,
          lifetimeGoo: state.lifetimeGoo + reward,
        });
        return reward;
      },

      /**
       * Catches the visiting slime. Returns what it paid, or null when there
       * was nobody there - which is what makes a double tap harmless.
       */
      catchPopIn: () => {
        const state = get();
        const def = visitorDef(state);
        if (!def || !popInActive(state)) return null;

        // A catch is a second, better-odds route to the rare variant than the
        // tap-find, but it still cannot hand out a duplicate.
        const foundSkinId =
          !state.ownedSkins.includes(GOLDEN_SKIN_ID) && Math.random() < POP_IN_GOLDEN_CHANCE
            ? GOLDEN_SKIN_ID
            : undefined;

        const cleared = {
          popInSlimeId: null,
          visitorTypeId: null,
          popInExpiresAt: 0,
          popInsCaught: state.popInsCaught + 1,
          ...(foundSkinId ? { ownedSkins: [...state.ownedSkins, foundSkinId] } : null),
        };

        if (def.reward.kind === 'frenzy') {
          // Frenzy replaces rather than stacks: catching two in a row should
          // refresh the window, not multiply into something absurd.
          set({
            ...cleared,
            frenzyExpiresAt: now() + def.reward.durationMs,
            frenzyMultiplier: def.reward.multiplier,
          });
          get().syncAchievements();
          return { visitorId: def.id, kind: 'frenzy' as const, reward: 0, foundSkinId };
        }

        const reward = popInReward(state, def, rewardVariance());
        set({
          ...cleared,
          goo: state.goo + reward,
          lifetimeGoo: state.lifetimeGoo + reward,
          ...addProgress(state, { goo: reward }),
        });
        get().syncAchievements();
        return { visitorId: def.id, kind: 'currency' as const, reward, foundSkinId };
      },

      /**
       * Scores a bonus round stopped at `position` (0..1 across the bar) and
       * starts the cooldown. Returns null when no round was available, so a
       * replayed screen cannot pay twice.
       */
      playBonusRound: (position: number) => {
        const state = get();
        if (!bonusRoundReady(state)) return null;

        const band = bandForPosition(position);
        const reward = Math.ceil(bonusRoundBase(state) * band.multiplier);

        set({
          nextBonusRoundAt: now() + BONUS_ROUND_COOLDOWN_MS,
          bonusRoundsPlayed: state.bonusRoundsPlayed + 1,
          bestBonusMultiplier: Math.max(state.bestBonusMultiplier, band.multiplier),
          goo: state.goo + reward,
          lifetimeGoo: state.lifetimeGoo + reward,
          ...addProgress(state, { goo: reward }),
        });
        get().syncAchievements();
        return { reward, multiplier: band.multiplier, label: band.label };
      },

      /**
       * Feeds or pets the slimes, starting both the buff and its cooldown from
       * the same timestamp. Returns false when the action is still resting.
       */
      careFor: (id: CareActionDef['id']) => {
        const state = get();
        if (!careReady(state, id)) return false;
        const t = now();
        set(
          id === 'feed'
            ? { lastFedAt: t, timesFed: state.timesFed + 1 }
            : { lastPettedAt: t, timesPetted: state.timesPetted + 1 }
        );
        get().syncAchievements();
        return true;
      },

      /** Clears the achievements badge once the player has seen the list. */
      markAchievementsSeen: () => {
        set((s) => ({ seenAchievements: [...s.unlockedAchievements] }));
      },

      /** First-run naming is free and does not consume the free changes twice. */
      completeOnboarding: (farmName: string, displayName: string) => {
        set({
          farmName: sanitizeName(farmName, DEFAULT_FARM_NAME),
          displayName: sanitizeName(displayName, DEFAULT_DISPLAY_NAME),
          freeFarmNameUsed: true,
          freeDisplayNameUsed: true,
          onboardingComplete: true,
        });
      },

      // Developer testing mode. These are inert in a release build: the guard
      // folds to false at build time, so the flag can never be turned on.
      setDevMode: (enabled: boolean) => {
        if (!__DEV__) return;
        set({ devModeEnabled: enabled });
      },

      toggleDevMode: () => {
        if (!__DEV__) return;
        set((s) => ({ devModeEnabled: !s.devModeEnabled }));
      },

      grantDevGoo: () => {
        if (!__DEV__ || !get().devModeEnabled) return;
        set((s) => ({ goo: s.goo + DEV_GOO_GRANT, lifetimeGoo: s.lifetimeGoo + DEV_GOO_GRANT }));
      },

      resetProgress: () => {
        // Progress resets; paid entitlements and the names attached to them do
        // not. Achievements go with progress: they are earned from the counters
        // that are about to be zeroed, so keeping them would leave permanent
        // perks attached to a run that no longer exists.
        const s = get();
        set({
          ...initialState(),
          purchasedAddOns: s.purchasedAddOns,
          ownedSkins: s.ownedSkins,
          noAdsPurchased: s.noAdsPurchased,
          farmName: s.farmName,
          displayName: s.displayName,
          selectedBackdropId: s.selectedBackdropId,
          devModeEnabled: s.devModeEnabled,
          onboardingComplete: s.onboardingComplete,
          freeFarmNameUsed: s.freeFarmNameUsed,
          freeDisplayNameUsed: s.freeDisplayNameUsed,
        });
      },

      touchSave: () => set({ lastSavedAt: now() }),
    }),
    {
      name: SAVE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      version: 7,
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

        if (fromVersion < 4) {
          patched.devModeEnabled ??= false;
        }

        if (fromVersion < 5) {
          // Existing players already have names and should not be sent through
          // onboarding, but they still get their one free change each.
          patched.onboardingComplete ??= true;
          patched.freeFarmNameUsed ??= false;
          patched.freeDisplayNameUsed ??= false;
        }

        if (fromVersion < 6) {
          // Daily engagement is new. Start everyone with a clean, current
          // period rather than backdating anything.
          patched.streakDays ??= 0;
          patched.lastStreakClaimDay ??= '';
          patched.dailyKey ??= dayKey();
          patched.dailyCounters ??= emptyCounters();
          patched.claimedQuestIds ??= [];
          patched.weeklyKey ??= weekKey();
          patched.weeklyCounters ??= emptyCounters();
          patched.weeklyClaimed ??= false;
        }

        if (fromVersion < 7) {
          // Live events and achievements are new. Start the spawn clocks at the
          // current moment rather than 0 - a zero would read as "never spawned"
          // and fire the pity timer the instant an existing player opened the
          // app. Achievements are left empty and the first tick backfills every
          // one the player has already earned.
          const t = now();
          patched.popInSlimeId ??= null;
          patched.visitorTypeId ??= null;
          patched.popInExpiresAt ??= 0;
          patched.lastSpawnCheckAt ??= t;
          patched.lastSpawnAt ??= t;
          patched.popInsCaught ??= 0;
          patched.frenzyExpiresAt ??= 0;
          patched.frenzyMultiplier ??= 1;
          patched.nextBonusRoundAt ??= 0;
          patched.bonusRoundsPlayed ??= 0;
          patched.bestBonusMultiplier ??= 0;
          patched.lastFedAt ??= 0;
          patched.lastPettedAt ??= 0;
          patched.timesFed ??= 0;
          patched.timesPetted ??= 0;
          patched.unlockedAchievements ??= [];
          patched.seenAchievements ??= [];

          // Backfill everything this player already earned before the feature
          // existed, and mark it seen in the same pass - otherwise a long-time
          // player opens the app to a badge counting two dozen things they did
          // months ago. This runs once, here, rather than on every rehydrate,
          // so it can never clear a badge the player genuinely has not read.
          const earned = newlyUnlocked(patched as GameState);
          if (earned.length > 0) {
            patched.unlockedAchievements = [...patched.unlockedAchievements, ...earned];
            patched.seenAchievements = [...patched.unlockedAchievements];
          }
        }

        return patched;
      },
    }
  )
);
