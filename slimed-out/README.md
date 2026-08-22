# Slimed Out!

An idle slime-collecting clicker built with [Expo](https://expo.dev) / React Native.
Tap to make goo, unlock a growing collection of slimes that produce goo on their
own, buy upgrades, and keep earning while the app is closed.

> **New to this codebase?** [`HANDOFF.md`](./HANDOFF.md) is the developer handoff -
> code map, economy tuning knobs, what's still mocked before release, and the
> non-obvious traps worth knowing about first.

## Gameplay

- **Tap** the Basic Slime on the Home tab to earn goo directly. It dozes when
  idle, wakes up when you tap it, and squishes on contact.
- **Slimes** (Slimes tab) are idle producers - 22 of them. Each unlocks once
  you've earned enough lifetime goo, costs more the more you own (a classic
  1.15x-per-unit curve), and has its own line of production-doubling upgrades
  at 1/5/10/25/50/100/150/200 owned. Tap any one for its character card:
  portrait, lore, and live stats.
- Several slimes (Golem, Selkie, Bog Wisp, Banshee, Troll, Kelpie, Brownie,
  Sprite, Gnome, Gargoyle) take gentle inspiration from widely-known European
  folklore. They're written as respectful nods to those legends, not
  caricatures of any culture, and each names its source tradition on its
  character card - see the `originNote` field in `src/game/slimeData.ts`.
- **Upgrades** (Upgrades tab) are tap-power boosts - 20 of them, all bought
  with in-game goo. Every total-slimes-owned milestone of 25 also grants a
  free +10% global production bonus.
- **Backdrops**: four free illustrated scenes, picked in Settings. None of them
  cost money.
- **Offline progress**: closing the app doesn't stop your slimes. On the next
  launch (or when you background/foreground the app), you get a share of what
  they produced while you were away, capped at 8 hours by default (see
  `src/game/economy.ts`).
- Progress is saved automatically (Zustand + AsyncStorage) after every action
  and on backgrounding, so nothing is lost between sessions.

## Monetization

Every upgrade needed to fully progress is free and earned by playing - nothing
below is required, and nothing gates progression.

- **Remove Ads - $0.99**: one-time, turns off interstitial ad breaks. Ads are
  paced generously anyway: the first can't appear until a player has made real
  progress (~4 minutes and 2,500 lifetime goo), then at most once every ~4
  minutes.
- **Make it yours - $0.25 to $0.50**: name your farm, choose a display name, or
  take a supporter badge.
- **Convenience - $0.50**: double goo for an hour (repeatable), extra offline
  hours, or a small permanent +5%.
- **Rare finds - $0.50**: the Golden Slime. It also turns up on its own during
  normal play - this is only for anyone who never caught one.
- **Collection - $0.25 to $0.50**: alternate slime skins and tap trails.
- **Starter Pack - $0.99**: a goo headstart plus two cosmetics, cheaper than
  buying the parts.

Backdrops are free for everyone and chosen in Settings. "Gift a Friend" and
"More Farm Plots" appear as Coming Soon and are not purchasable.

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
src/art/             Code-drawn SVG: slime sprites, toppers, backdrops
src/game/            Data + pure logic: slimes, upgrades, shop, skins,
                     economy, the persisted store, and the game loop hook
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

- [Expo Go](https://expo.dev/go) on a physical phone (fastest way to try it - see below)
- an iOS Simulator or Android Emulator
- a web browser (`npx expo start --web`)

Ads and in-app purchases will use their mock/dev implementations in all of
these - see the Monetization section above.

### Trying it on your phone with Expo Go

Each build of Expo Go bundles exactly **one** Expo SDK version, and it has to
match the `expo` version in `package.json` or you'll get "Project is
incompatible with this version of Expo Go".

This project targets **SDK 54**, which is the version currently published on
the App Store and Play Store - so the stock Expo Go download works on both
platforms with no extra steps:

1. Install **Expo Go** from the [App Store](https://apps.apple.com/us/app/expo-go/id982107779)
   or Play Store.
2. Run `npx expo start` on your computer.
3. Make sure the phone and computer are on the **same Wi-Fi network**, then
   scan the QR code from the terminal - with the Camera app on iOS, or from
   inside Expo Go on Android.

If the phone and computer can't be put on the same network (guest Wi-Fi, VPN,
or locked-down corporate networks often block this), run
`npx expo start --tunnel` instead, which routes through Expo's servers.

Note that if you ever upgrade this project past SDK 54, Expo Go is no longer
distributed on the App Store for SDK 55+ - you'd need a matching build from
[sign.expo.dev](https://sign.expo.dev) or a development build via EAS.

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
   purchasable id in `src/game/shopData.ts`. Coming Soon entries have no price
   and must not be created as store products.
4. Verify purchase receipts server-side before granting entitlements for a
   production release.
