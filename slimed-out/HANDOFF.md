# Slimed Out! — developer handoff

An idle slime-collecting clicker for iOS and Android, built with Expo / React Native.
Everything below is what you need to run it, change it, and know exactly which parts
are still standing in for the real thing.

| | |
|---|---|
| **Branch** | `claude/slimed-out-clicker-game-roymq3` |
| **Project dir** | `slimed-out/` |
| **Stack** | Expo SDK 54 · React Native 0.81.5 · React 19.1 · Zustand 5 |
| **State** | Playable end to end; ads and purchases are mocked |

---

## Contents

- [Run it](#run-it)
- [Code map](#code-map)
- [Game model](#game-model)
- [Tuning](#tuning)
- [Monetization](#monetization)
- [Before release](#before-release)
- [Known traps](#known-traps)
- [Test status](#test-status)

---

## Run it

> ### Read this before installing Expo Go
>
> Every build of Expo Go bundles **exactly one** SDK version, and it must match the
> `expo` version in `package.json` or the app refuses to open with *"Project is
> incompatible with this version of Expo Go."*
>
> This project is pinned to **SDK 54** specifically because that is the version
> published on the App Store and Play Store. Do not casually bump it — SDK 55+ was
> pulled from the App Store, and upgrading means every tester needs a build from
> `sign.expo.dev` or a full EAS development build instead of a free download.

Requires Node.js 20+ (22 LTS recommended) and Git.

**1. Clone the branch and install**

```bash
git clone https://github.com/Brandon6581/brandon6581.github.io.git
cd brandon6581.github.io
git checkout claude/slimed-out-clicker-game-roymq3
cd slimed-out
npm install
```

**2. Start the dev server**

```bash
npx expo start
```

**3. Install Expo Go** from the App Store or Play Store. The stock version is correct —
no special build needed.

**4. Scan the terminal QR code.** On **iOS** use the built-in Camera app and tap the
banner; on **Android** scan from inside Expo Go. Phone and computer must be on the same
network.

### If the QR code hangs

Two causes account for nearly all of it. On Windows, the firewall prompt on first launch
must be allowed for **Private networks** or the phone cannot reach port 8081. And some
networks isolate clients from each other. Either way:

```bash
npx expo start --tunnel
```

That routes through Expo's servers — slower to load, but network-agnostic.

### Other targets

```bash
npx expo start --web     # browser, fastest iteration
npx tsc --noEmit -p .    # typecheck
npx expo lint            # lint
```

---

## Code map

The split that matters: `src/game/` is pure logic and data with no UI imports, so you can
retune the entire economy without opening a screen file.

```
app/(tabs)/              five screens, Expo Router file-based tabs
  index.tsx              tap screen + goo floaters
  slimes.tsx             buy slimes, buy per-slime upgrades
  upgrades.tsx           tap-power tree, collection bonus
  shop.tsx               real-money storefront
  settings.tsx           restore, reset, folklore note

src/game/                — pure logic, no UI —
  types.ts               shared shapes + upgrade milestones
  slimeData.ts           11 slimes: cost, output, unlock gate
  upgradeData.ts         10 free tap upgrades
  addOnData.ts           10 paid add-ons + their effects
  economy.ts             all formulas: cost, gps, offline
  store.ts               Zustand store, AsyncStorage-persisted
  useGameLoop.ts         1s tick, background/foreground, offline

src/services/
  adService.ts           ad pacing rules + mock implementation
  iapService.ts          purchase abstraction + mock implementation

src/components/          providers, modals, screen chrome
metro.config.js          zustand web fix — see Known traps
```

### State and saving

One Zustand store persisted to AsyncStorage under the key `slimed-out/save/v1`. It writes
after every action, and `useGameLoop` stamps a save on background. The `version` field is
there so you can add a migration when the save shape changes — bump it and supply a
`migrate` function rather than silently breaking existing players.

---

## Game model

Four systems compose into the total production number:

| System | Rule | Where |
|---|---|---|
| **Slime cost** | Each unit costs `baseCost × 1.15^owned` — the standard idle curve. | `economy.ts` |
| **Per-slime upgrades** | At 1, 5, 10, 25, 50, 100, 150, 200 owned, a purchase **doubles** that slime's per-unit output. Eight tiers each. | `types.ts` |
| **Collection bonus** | Free +10% to *all* production per 25 total slimes owned. | `economy.ts` |
| **Unlock gates** | Slimes and upgrades appear once lifetime goo passes a threshold, so the shop reveals itself gradually instead of showing eleven locked rows on day one. | `slimeData.ts` |

### Offline progress

On cold start and on every background → foreground transition, the store diffs
`lastSavedAt` against now, credits production at **50%** of the live rate, and caps the
window at **8 hours**. Gaps under a minute are ignored so the modal does not fire every
time someone checks a notification.

### A content note worth preserving

Five slimes (Golem, Selkie, Bog Wisp, Banshee, Troll) draw on widely-known European
folklore and each carries an `originNote` naming its source tradition, surfaced in-app on
the slime card and summarized on the Settings screen. This was deliberate: the brief asked
for folklore without cultural insensitivity, so the roster stays with broadly-circulated
European legends written as respectful nods, and names the origin rather than flattening
it into generic "monster" flavor. **If you add slimes, keep that pattern.**

---

## Tuning

Balance changes are data edits, not code changes. These are the knobs you will actually
reach for:

| Constant | File | Now | Controls |
|---|---|---|---|
| `costGrowth` | `slimeData.ts` | 1.15 | Price escalation per unit. Small changes compound hard — treat 1.15 as the default for a reason. |
| `baseGps` | `slimeData.ts` | 0.1 → 10M | Per-unit output by tier. |
| `unlockAtLifetimeGoo` | `slimeData.ts` | 0 → 1T | When each slime appears. Lower these to shorten the early game. |
| `BASE_OFFLINE_CAP_HOURS` | `economy.ts` | 8 | Max offline accrual window. |
| `OFFLINE_EARNINGS_RATE` | `economy.ts` | 0.5 | Offline rate vs. active play. |
| `firstAdMinLifetimeGoo` | `adService.ts` | 2,500 | Progress gate before any ad can show. |
| `firstAdMinSessionMs` | `adService.ts` | 4 min | Time gate before the first ad. |
| `minIntervalMs` | `adService.ts` | 4 min | Floor between any two ads. |

> **While testing:** those ad gates mean you will not see an interstitial for the first
> several minutes of a fresh session — that is intentional, not a broken integration. Drop
> `firstAdMinSessionMs` to a few seconds if you need to exercise the flow.

---

## Monetization

The governing rule, and the one to defend in review: **the entire upgrade tree is
reachable without spending anything.** Paid items are ad removal, cosmetics, and two small
optional accelerators. Nothing is paywalled.

| Product | Price | Count | Effect |
|---|---|---|---|
| **Remove Ads** (`slimed_out_no_ads`) | $0.99 | 1 | Disables interstitials permanently. |
| **Add-ons** | $0.25 | 5 | Cosmetic only — skins, tap trail, theme, sound pack, nicknames. |
| **Add-ons** | $0.50 | 5 | Three cosmetic, plus +5% production and +8 offline hours. |

Product IDs for the add-ons are the `id` fields in `addOnData.ts` — they must match what
you create in App Store Connect and the Play Console exactly.

---

## Before release

Ads and purchases run against **mock implementations** today. That was deliberate: it keeps
the whole game testable in Expo Go with no store credentials and no custom native build.
It also means none of it is real yet.

| Area | Today | Needs |
|---|---|---|
| Game loop, economy, save/offline | **Real** | Nothing — this is production logic. |
| Interstitial ads | **Mock** | `react-native-google-mobile-ads` + AdMob unit IDs. Pacing logic already real. |
| In-app purchases | **Mock** | `react-native-iap` + store product IDs. |
| Restore purchases | **Mock** | Returns empty — the mock never left the device. |
| Receipt validation | **Missing** | Server-side verification before granting entitlements. |
| Bundle IDs, icons | **Placeholder** | `com.example.slimedout` and stock Expo art in `app.json`. |

### Checklist

- [ ] Replace `ios.bundleIdentifier` and `android.package` in `app.json`; ship real icons.
- [ ] Swap in the real ad SDK per the header comment in `adService.ts`.
- [ ] Swap in real IAP per the header comment in `iapService.ts`.
- [ ] Create products in App Store Connect and Play Console matching the IDs in `addOnData.ts`.
- [ ] Add server-side receipt validation.
- [ ] Move to an EAS development build — neither native SDK runs in Expo Go.

Both service files carry step-by-step wiring notes in a header comment, including which
calls to implement. Read those before starting; they are more specific than this page.

---

## Known traps

### The zustand web bug — do not delete `metro.config.js`

zustand's ESM build references `import.meta`. Metro bundles it as a classic script for web,
so it throws *"Cannot use 'import.meta' outside a module"* at runtime. The failure mode is
nasty: **the build succeeds and the page renders normally, but nothing is interactive.** No
taps register, no errors in the terminal.

`metro.config.js` redirects zustand's web resolution to its CommonJS build. It is scoped to
web and to zustand only, so package exports stay on for everything else. Native was never
affected — zustand's `react-native` export condition already resolves to CJS.

If you ever see a dead-but-rendered web build, check the bundle for `import.meta` before
anything else:

```bash
npx expo export --platform web
grep -o "import\.meta" dist/_expo/static/js/web/*.js | wc -l   # expect 0
```

### Dependency versions are pinned to the SDK

Versions come from Expo's SDK 54 manifest, not from npm's latest. Use
`npx expo install <pkg>` rather than `npm install` so you get the SDK-compatible version.
Reanimated 4 also requires the `react-native-worklets` peer, which is why it is in the
dependency list without being imported directly.

---

## Test status

Be precise about this, because it shapes where to look first if something breaks.

| Check | Result |
|---|---|
| TypeScript `--noEmit` | Pass |
| `expo lint` | Pass |
| Clean clone + `npm ci` | Pass |
| iOS bundle compiles (3.7 MB Hermes) | Pass |
| Tapping, slime purchase, upgrades | Verified in browser |
| Save persistence across reload | Verified in browser |
| Shop purchase flow | Verified in browser |
| Offline earnings math | Verified in browser |
| On a physical device | **Not yet** |

Everything above was exercised in a real browser against the web build, plus a compile
check of the iOS bundle. **Nothing has been run on actual hardware yet** — no simulator, no
phone. Haptics and the native tab-bar blur in particular have no browser equivalent and are
genuinely unverified. First device run is the obvious next step.
