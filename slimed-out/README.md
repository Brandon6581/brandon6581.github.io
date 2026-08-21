# Slimed Out!

An idle slime-collecting clicker built with [Expo](https://expo.dev) / React Native.
Tap to make goo, unlock a growing collection of slimes that produce goo on their
own, buy upgrades, and keep earning while the app is closed.

## Gameplay

- **Tap** the Basic Slime on the Home tab to earn goo directly.
- **Slimes** (Slimes tab) are idle producers. Each unlocks once you've earned
  enough lifetime goo, costs more the more you own (a classic 1.15x-per-unit
  curve), and has its own line of production-doubling upgrades at 1/5/10/25/
  50/100/150/200 owned.
- A handful of the later slimes (Golem, Selkie, Bog Wisp, Banshee, Troll) take
  gentle inspiration from widely-known European folklore. They're written as
  respectful nods to those legends, not caricatures of any culture - see the
  "About" section on the Settings tab and the `originNote` field in
  `src/game/slimeData.ts`.
- **Upgrades** (Upgrades tab) are tap-power boosts, all bought with in-game
  goo. Every total-slimes-owned milestone of 25 also grants a free +10%
  global production bonus.
- **Offline progress**: closing the app doesn't stop your slimes. On the next
  launch (or when you background/foreground the app), you get a share of what
  they produced while you were away, capped at 8 hours by default (see
  `src/game/economy.ts`).
- Progress is saved automatically (Zustand + AsyncStorage) after every action
  and on backgrounding, so nothing is lost between sessions.

## Monetization

Every upgrade needed to fully progress through the game is free and earned by
playing - nothing below is required.

- **Remove Ads - $0.99**: one-time purchase, turns off interstitial ad breaks.
  Ads themselves are paced generously: the first one can't appear until a
  player has made real progress (past the second slime and ~4 minutes of
  play), and afterwards they're capped to at most once every ~4 minutes. See
  `src/services/adService.ts` for the exact thresholds.
- **Add-ons - $0.25 or $0.50 each**: small, optional cosmetics (skins,
  themes, sound packs, a supporter badge) and a couple of modest, optional
  accelerators (a small permanent production bonus, extra offline hours).
  See `src/game/addOnData.ts` for the full catalog.

Ads and purchases run on **mock services** out of the box so the whole game
loop, shop, and ad pacing can be built and tested without any store
credentials or a custom native build. Look for `DevAdService` in
`src/services/adService.ts` and `MockIAPService` in
`src/services/iapService.ts` - both files document exactly what to swap in
(`react-native-google-mobile-ads` and `react-native-iap` respectively) before
a real release.

## Project structure

```
app/(tabs)/          Screens: Home (tap), Slimes, Upgrades, Shop, Settings
src/game/            Data + pure logic: slimes, upgrades, add-ons, economy,
                     the persisted Zustand store, and the game loop hook
src/services/        Ad pacing and IAP abstractions (mock + prod wiring notes)
src/components/      Shared UI: providers for ads/IAP, modals, screen chrome
```

The economy (costs, production rates, unlock thresholds, offline caps) all
lives in `src/game/economy.ts` and the `*Data.ts` files - tune numbers there
without touching any UI code.

## Running the app

```bash
npm install
npx expo start
```

From the Expo CLI output you can open the app in:

- an iOS Simulator or Android Emulator
- [Expo Go](https://expo.dev/go) on a physical device (fastest way to try it)
- a web browser (`npx expo start --web`)

Ads and in-app purchases will use their mock/dev implementations in all of
these - see the Monetization section above.

## Before publishing to the App Store / Play Store

1. Replace the placeholder `ios.bundleIdentifier` / `android.package` in
   `app.json` with your real reverse-DNS identifiers, and set real app icons
   under `assets/images/`.
2. Wire up real ads and purchases (`react-native-google-mobile-ads` and
   `react-native-iap` - both require an EAS/custom dev client build, they
   will not run in Expo Go). Follow the comments at the top of
   `src/services/adService.ts` and `src/services/iapService.ts`.
3. Create matching product IDs in App Store Connect / Play Console: one
   non-consumable for Remove Ads (`slimed_out_no_ads`, $0.99) and one per
   add-on id in `src/game/addOnData.ts` ($0.25 or $0.50 each).
4. Verify purchase receipts server-side before granting entitlements for a
   production release.
