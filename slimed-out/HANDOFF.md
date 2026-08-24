# Slimed Out! — developer handoff

An idle slime-collecting clicker for iOS and Android, built with Expo / React Native.
Everything below is what you need to run it, change it, and know exactly which parts
are still standing in for the real thing.

| | |
|---|---|
| **Branch** | `claude/slimed-out-clicker-game-roymq3` |
| **Project dir** | `slimed-out/` |
| **Stack** | Expo SDK 54 · React Native 0.81.5 · React 19.1 · Zustand 5 · react-native-svg 15 |
| **State** | Playable end to end; ads and purchases are mocked |
| **Content** | 22 slimes · 20 tap upgrades · 4 free backdrops · 4 skins |

---

## Contents

- [Run it](#run-it)
- [Code map](#code-map)
- [Art system](#art-system)
- [Game model](#game-model)
- [Daily engagement](#daily-engagement)
- [Live events and achievements](#live-events-and-achievements)
- [Tuning](#tuning)
- [Monetization](#monetization)
- [Before release](#before-release)
- [Developer testing mode](#developer-testing-mode)
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
  index.tsx              tap screen — READ THE HEADER COMMENT
  slimes.tsx             roster; links into character cards
  upgrades.tsx           tap-power tree, collection bonus
  shop.tsx               real-money storefront
  settings.tsx           backdrop picker, restore, reset
app/slime/[id].tsx       character card: portrait, lore, stats
  achievements.tsx       permanent milestone list, some with standing perks
app/daily.tsx            login streak, daily quests, weekly challenge

src/startup/             first-run flow, shown above the navigator
  StartupGate.tsx        studio splash -> onboarding -> game
  BrandSplash.tsx        Norseth Enterprises card
  Onboarding.tsx         welcome, free naming, how to play

src/art/                 — all rendering is code-drawn SVG, no bitmaps —
  slimeLook.ts           topper + eye-state types, palette shape
  SlimeSprite.tsx        the painterly slime renderer
  Toppers.tsx            12 topper variants (horns, fin, crown, ...)
  Backdrop.tsx           illustrated scene renderer
  useSlimeEyes.ts        asleep / roused / blink state machine

src/game/                — pure logic, no UI —
  types.ts               shared shapes + upgrade milestones
  slimeData.ts           22 slimes: cost, output, unlock gate, look
  upgradeData.ts         20 free tap upgrades
  entitlements.ts        the ONE place ownership is decided
  shopData.ts            paid catalog: categories, effects, Coming Soon
  skinData.ts            collectible looks + the findable golden variant
  backgroundData.ts      backdrop variants (all free)
  economy.ts             all formulas: cost, gps, offline
  daily.ts               period boundaries, counters, streak + reward math
  dailyData.ts           quest pools, streak table, welcome-back constants
  events.ts              spawn engine, bonus scoring, care cooldowns
  eventData.ts           visitor pool, spawn odds, bands, care actions
  achievements.ts        evaluation + perk totals (never imports economy)
  achievementData.ts     30 milestones and their standing perks
  store.ts               Zustand store, AsyncStorage-persisted
  useGameLoop.ts         1s tick, background/foreground, offline

src/dev/                 — never ships; stripped at build time —
  devMode.ts             the build gate + activation code
  DevPanel.tsx           hidden code field and dev panel

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

## Art system

Everything visual is **code-drawn SVG** (`react-native-svg`). There are no image
assets to manage, so a new slime is a data entry, not an art pipeline.

### Slimes

Each slime shares one silhouette — a soft dome with a slightly drippy lower edge —
and is told apart by a `look` in `slimeData.ts`:

```ts
look: { body: ['#8FE08A', '#3E9E77'], accent: '#CFF3B6', topper: 'none' }
```

- `body` is `[top, bottom]` of a diagonal gradient. Use **two different hues**, not
  two shades of one — the blend is the whole point of the style.
- `accent` tints the topper and the eye glow.
- `topper` is one of 12 shapes in `Toppers.tsx`. Toppers render *behind* the body so
  their bases tuck under the dome and read as growing out of the creature.

The sprite layers, bottom to top: contact shadow → topper → gradient body → inner
core glow → rim light → surface bubbles → specular gloss → outline → face. Bubbles
are seeded from the slime id so they are stable across renders but differ per slime.

**To add a slime:** append to `SLIMES` with a `look`. Nothing else needs touching.

### Eye states

`useSlimeEyes()` drives exactly three states off activity alone:

| State | When |
|---|---|
| `asleep` | Resting — nothing has happened for ~2.6s. This is the default. |
| `roused` | Woken by `rouse()`, i.e. the player tapped. Wide, with glints. |
| `blink` | Brief closure, only while awake. |

The hook is state only — it never touches layout or gestures, so it is safe to call
from a decorative sprite layer.

### Backdrops

The app never shows a flat color. `backgroundData.ts` defines variants as data
(sky gradient, glow position, three silhouette bands, mote style); `Backdrop.tsx`
renders them. `Mossy Grove` is the free default.

**All four backdrops are free, and the picker lives in Settings.** Both are decided
calls. A backdrop is a display preference with no real ownership weight, so it is
not something to charge for, and it belongs with the other preferences rather than
in a place to buy things. Starlight used to be a $0.25 purchase; it is now free like
the rest.

`unlockedBy` stays in the data model — it costs nothing and leaves room for a
genuinely special backdrop later — but nothing sets it today.
`resolveBackdrop()` falls back to the free default if a saved id is unknown.

**To add a backdrop:** one entry in `BACKDROPS`. Add a new `shape` only if none of
the four existing silhouettes fit.

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
time someone checks a notification. The welcome-back bonus rides on top of this — see
below.

### A content note worth preserving

Five slimes (Golem, Selkie, Bog Wisp, Banshee, Troll) draw on widely-known European
folklore and each carries an `originNote` naming its source tradition, surfaced in-app on
the slime card and summarized on the Settings screen. This was deliberate: the brief asked
for folklore without cultural insensitivity, so the roster stays with broadly-circulated
European legends written as respectful nods, and names the origin rather than flattening
it into generic "monster" flavor. **If you add slimes, keep that pattern.**

---

## Daily engagement

Four retention features share one small module. `src/game/daily.ts` is pure functions —
period math, counters, reward sizing — and `src/game/dailyData.ts` is the data. The store
holds the state; `app/daily.tsx` renders it, reachable from a card on the home screen that
shows a badge when something is ready to collect.

| Feature | Rule |
|---|---|
| **Login streak** | One claim per local day. Claiming on the day after your last claim continues the run; any gap resets it to day 1. Rewards escalate across seven days (`STREAK_REWARD_SECONDS`), then hold at the day-seven value so a long run stays worth keeping without growing forever. |
| **Daily quests** | Three drawn from a pool of eight, chosen by hashing the date — so every session on a given day sees the same three, with no stored roll to keep in sync. Claimed ids live in `claimedQuestIds` and clear at rollover. |
| **Weekly challenge** | One drawn from a pool of four by hashing the week key, one payout per week, counted against a separate set of weekly counters. |
| **Welcome back** | Extra goo layered on top of offline earnings: 10% of the offline payout per hour away, capped at 100%, and nothing at all under 30 minutes away. Returned as its own `welcomeBackBonus` field on `OfflineResult` so the modal can show it as a separate line and the two stay independently tunable. |

### Rewards are seconds of production, not goo

Every goo target and every goo reward is written as **seconds of the player's own
production** with a floor, not a fixed number. This is the same lesson that flat tap power
taught: `10,000 goo` is a real day's work at launch and a rounding error once a collection
is running. Count-based goals — taps, purchases — stay fixed, because those cost the same
effort at every tier. The baseline used is `rawGps × baseGlobalMultiplier`, which
deliberately **excludes** the paid temporary boost, so buying a boost cannot inflate quest
rewards.

### Periods roll lazily

There is no timer watching for midnight. `rollPeriods()` compares the stored `dailyKey` /
`weeklyKey` against now and returns a patch when they differ; `addProgress()` calls it
before adding, so a counter can never land in the wrong day. The Daily screen also calls
`refreshPeriods()` on mount for the case where the app sat in the background across
midnight. Daily and weekly roll independently.

Periods use the device's **local** date, which does make the clock the source of truth —
moving the device clock forward can advance a period. For a single-player offline game
that is the right trade; if you ever add server-backed accounts, that is the place to
revisit.

---

## Live events and achievements

Four features that make the screen worth looking at rather than leaving open.

### The rare visitor

A slime turns up on the tap stage and pays out if it is caught before it
wanders off. The spawn engine (`events.ts`) checks **once a minute**, not
continuously, and two rules decide the outcome: a flat 10% chance per check, and
a **pity timer** that forces a spawn once 15 minutes have passed without one.
The pity timer exists because a run of bad luck reads to a player as the feature
being broken rather than as variance.

Both clocks live in persisted state, deliberately. Module-level counters would
reset on reload, which turns "wait for a spawn" into "restart the app to
re-roll".

| Visitor | Weight | On screen | Pays |
|---|---|---|---|
| Gilded Slime | 70 | 25s | 10 minutes of production |
| Glitch Slime | 25 | 20s | ×5 frenzy for 3 minutes |
| Cosmic Slime | 5 | 15s | 1 hour of production |

Rarer visitors pay more and linger less, so the best prize is also the hardest to
catch. Payouts carry a ±10% wobble so the number varies run to run. A catch is
also a second, better-odds route to the golden collectible than the tap-find.

> **Naming, on purpose:** the gilded visitor is not called "Golden Slime". The
> collection already has a golden variant — a permanent skin with its own
> standing perk — and one word for two unrelated things would be confusing in
> the UI.

> **Worth watching in tuning:** at roughly one spawn per 10 minutes averaged
> against the pity timer, an attentive player catching most Gilded visitors
> earns on the order of an extra hour of production per hour played. That is a
> deliberate "active play beats idle" choice, not an accident, but it is the
> single biggest lever in the game's balance. `RARE_VISITORS[].reward.seconds`
> is the dial.

### The bonus round

A marker sweeps a bar; stopping it near the centre multiplies the payout (×5
down to ×0.5). The catch-all band means a mistimed round always pays something,
so the button stays worth pressing. Free every 30 minutes.

The subtlety worth preserving: **what is drawn and what is scored come from the
same `sweepPosition()` function.** Reading a native-driver animated value back on
the JS side is throttled, and in a game where the top band is 3% of the bar, a
frame of disagreement is the difference between Perfect and Nice.

### Slime care

Feed (+25% production for 30 min, 4h cooldown) and pet (+50% tap power for 10
min, 45m cooldown). The cooldown is deliberately longer than the buff, so there
is a gap where the slimes are neither buffed nor ready — otherwise it is just a
permanent multiplier the player has to remember to re-press.

### Achievements

30 permanent milestones across six categories, unlocking on their own with
nothing to claim. Roughly a third carry a small standing perk, totalling about
+55% production and +45% tap power for a complete set. This is free progression
by design — the brief was that there should be a lot to earn without spending.

`achievements.ts` **must never import `economy.ts`.** economy reads the perk
totals from it, and a runtime cycle would leave one of the two undefined at
module init depending on which Metro loads first. That is why every predicate
reads a plain counter rather than a derived figure, and why the two small
helpers at the top of `achievementData.ts` are inlined rather than imported.

### Where the multipliers go

This distinction decides whether a bonus inflates quest rewards, so it matters:

| Kind | Goes in | Examples |
|---|---|---|
| **Permanent** | `baseGlobalMultiplier` | collection milestones, paid standing bonuses, skin perks, achievements |
| **Timed** | `temporaryMultiplier` | paid boost, frenzy, feed buff |

Daily quest targets and rewards are sized off the *base* figure, so a running
buff can never inflate what a quest pays. Offline earnings credit each timed buff
only for the slice of the window it actually covered; adding another timed buff
means adding it to `activeTimedBuffs()` and nothing else.

### Startup order

The offline summary waits for the studio card — and first-run onboarding — to
clear before it appears, so it lands on the dashboard rather than animating in
behind an opaque overlay where nobody sees it. `StartupGate` reports when the
overlay is clear and `useGameLoop` gates its *cold start* claim on that. Ticking
is not gated: the game runs underneath the splash so it is warm when the overlay
lifts. Resume-from-background claims are never gated, because the splash does not
replay on resume.

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
| `TAP_BASE_GPS_SECONDS` | `economy.ts` | 0.05 | Seconds of production a tap is worth at baseline. |
| `TAP_GPS_SECONDS_PER_UPGRADE` | `economy.ts` | 0.02 | Added per tap upgrade owned. |
| `perk` on a skin | `skinData.ts` | golden: +10% / +25% | Standing production and tap bonus while the skin is owned. |
| `STREAK_REWARD_SECONDS` | `dailyData.ts` | 60 → 1,000 | The seven-day streak curve, in seconds of production. |
| `rewardSeconds` / `rewardFloor` | `dailyData.ts` | per quest | What each quest and the weekly challenge pay. |
| `productionSeconds` / `floor` | `dailyData.ts` | per quest | Goo targets. Count targets use `amount` instead. |
| `WELCOME_BACK_PER_HOUR` | `dailyData.ts` | 0.1 | Share of offline goo added per hour away. |
| `WELCOME_BACK_MAX` | `dailyData.ts` | 1 | Cap on that share. |
| `WELCOME_BACK_MIN_AWAY_MS` | `dailyData.ts` | 30 min | Below this, no bonus is given. |
| `BASE_SPAWN_CHANCE` | `eventData.ts` | 0.10 | Visitor odds per one-minute check. |
| `PITY_THRESHOLD_MS` | `eventData.ts` | 15 min | Forced spawn after a dry spell. |
| `RARE_VISITORS[].reward` | `eventData.ts` | 600s / ×5 / 3600s | **The biggest balance lever in the game.** |
| `RARE_VISITORS[].weight` | `eventData.ts` | 70 / 25 / 5 | Draw odds within the pool. |
| `BONUS_ROUND_COOLDOWN_MS` | `eventData.ts` | 30 min | How often a free round comes back. |
| `BONUS_BANDS` | `eventData.ts` | ×5 → ×0.5 | Accuracy bands and their payouts. |
| `CARE_ACTIONS` | `eventData.ts` | +25% / +50% | Feed and pet strength, duration, cooldown. |
| `perk` on an achievement | `achievementData.ts` | ~+55% / +45% total | Free permanent progression. |
| `firstAdMinLifetimeGoo` | `adService.ts` | 2,500 | Progress gate before any ad can show. |
| `firstAdMinSessionMs` | `adService.ts` | 4 min | Time gate before the first ad. |
| `minIntervalMs` | `adService.ts` | 4 min | Floor between any two ads. |

> **While testing:** those ad gates mean you will not see an interstitial for the first
> several minutes of a fresh session — that is intentional, not a broken integration. Drop
> `firstAdMinSessionMs` to a few seconds if you need to exercise the flow.

---

## Monetization

The rule this catalog is built on: **a paid item should carry weight** - identity,
ownership, collection, or real convenience. Something that is only a different set
of pixels behind the UI does not qualify. That is why backdrops are free and chosen
in Settings rather than sold.

The free upgrade tree stays completable without spending anything. Nothing gates
progression; the timed boost only shortens a wait a player could sit through.

| Category | Items | Price |
|---|---|---|
| **Remove Ads** | Turns off interstitials | $0.99 |
| **Make it yours** | Name Your Farm, Display Name, Founder's Badge | $0.25–$0.50 |
| **Convenience** | 2x Goo for an Hour (repeatable), Offline Extender, Lucky Charm | $0.50 |
| **Rare finds** | Golden Slime — also findable in play | $0.50 |
| **Collection** | 3 slime skins, 2 tap trails | $0.25–$0.50 |
| **Bundle** | Starter Pack: 25K goo + 2 cosmetics | $0.99 |
| **Coming soon** | Gift a Friend, More Farm Plots | not purchasable |

Product ids are the `id` fields in `shopData.ts` and must match App Store Connect
and the Play Console exactly. `getProductCatalog()` filters out Coming Soon entries
so they can never reach a real store as products.

### How effects work

Purchases funnel through `applyShopItem(id)` in the store, which switches on the
item's `effect`. Most effects need nothing beyond recording ownership in
`purchasedAddOns` - `unlockFarmName`, `globalProductionMult`, `cosmetic` and friends
are all read straight off that list. The ones that do more:

- **`tempBoost`** sets `boostExpiresAt`, stacking onto any remaining time rather
  than truncating it. It is the one consumable, so `restoreEntitlements` explicitly
  skips it - restoring purchases must not hand out free boosts.
- **`bundle`** grants goo plus a set of skins and extras in one go.
- **`skin`** adds to `ownedSkins`; `resolveLook()` makes every sprite honor it.

### The timed boost and offline earnings

A running boost is credited for **only the slice of the offline window it actually
covered** (see `computeOfflineEarnings`). Buying an hour of double goo and closing
the app still pays out, but the boost never silently doubles an entire 8-hour
window. `baseGlobalMultiplier()` exists precisely so offline can compute without
the boost and add the overlap separately.

### Identity

`farmName` and `displayName` live in the store with `name_your_farm` and
`custom_username` as their unlock gates. The setters refuse to write unless the
matching item is owned, so the gate holds even if UI is wired up wrong. Names are
trimmed, collapsed, and capped at 24 characters. `resetProgress` deliberately keeps
entitlements, skins, and names - wiping progress should not confiscate purchases.

### Why tapping scales off production

Flat tap power cannot keep up with an idle curve. With every tap upgrade bought,
a tap was worth about **0.15 seconds** of mid-game passive income - so tapping
read as doing nothing even though it was adding goo. That was reported as a bug
("goo does not generate while tapping"); it was really a scaling problem.

Each tap is now `flat tap power + (current production x tapGpsSeconds)`. The
share grows with tap upgrades owned, so active play stays meaningful at every
tier **and scales itself as slimes are added** - there is no tap table to
re-tune when the roster grows.

### Collectible perks

A skin may carry a `perk` (`{ production, tap }`) granting a standing bonus while
it is in the collection. `economy.ts` sums perks across owned skins, so adding
another perk skin later needs no economy change.

`describePerk()` builds the player-facing sentence from those same numbers,
phrased as an ownership benefit rather than a bare stat line — *"While the Golden
Slime is in your collection, you gain +10% goo production and +25% tap power."*
It appears on the character card and on the discovery modal, and the shop blurb
matches. Use it rather than writing percentages by hand, so the copy cannot drift
from the values the economy actually applies.

### The rare variant

The Golden Slime can turn up on its own: a 1-in-1500 chance per tap, after 150
taps, once only. Finding it shows a celebration modal and adds it to `ownedSkins` -
the same state buying it would produce, so there is one code path either way.

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
| Gift a Friend | **Deferred** | Shown as Coming Soon; not a store product. Needs player accounts and a server before it can work. |

### Checklist

- [ ] Replace `ios.bundleIdentifier` and `android.package` in `app.json`; ship real icons.
- [ ] Swap in the real ad SDK per the header comment in `adService.ts`.
- [ ] Swap in real IAP per the header comment in `iapService.ts`.
- [ ] Create products in App Store Connect and Play Console matching the purchasable IDs in `shopData.ts` (Coming Soon entries are not products).
- [ ] Add server-side receipt validation.
- [ ] Run `npm run check:no-dev-mode` and confirm it passes.
- [ ] Move to an EAS development build — neither native SDK runs in Expo Go.

Both service files carry step-by-step wiring notes in a header comment, including which
calls to implement. Read those before starting; they are more specific than this page.

---

## Developer testing mode

Internal testing only. Enter the code **`slimetime`** in the small unlabeled field
at the bottom of Settings to unlock every paid entitlement; enter it again, or flip
the switch in the panel that appears, to turn it back off. State persists across
reloads, so testing does not require reinstalling.

### It cannot ship — and that is enforced, not just intended

A "free everything" backdoor in a live build is an App Store rejection risk and a
straightforward exploit. So this is gated at **build** time, not run time.

`__DEV__` is a literal `true` in development and `false` in release builds. Babel
inlines it per module and the minifier eliminates the dead branch, so in a
production bundle the panel, the activation code, and the unlock logic are
**physically absent** rather than merely disabled. Three consequences:

1. The Settings field does not render — there is nothing for a reviewer to find.
2. A hand-edited save with `devModeEnabled: true` grants nothing.
3. The activation code is not in the shipped JS, so it cannot be grepped out.

### Run this before every submission

```bash
npm run check:no-dev-mode
```

It exports real production bundles for iOS **and** Android and fails (exit 1) if any
dev-mode marker survives. It is verified to work in both directions: it passes on the
current code, and it correctly fails when the gate is deliberately weakened.

### The one mistake to avoid

Guards must test `__DEV__` **in the same file** as the code they protect:

```ts
// WRONG - Metro does not propagate constants across modules, so this stays a
// live runtime check and the guarded strings ship in the bundle.
import { DEV_MODE_AVAILABLE } from './devMode';
if (!DEV_MODE_AVAILABLE) return null;

// RIGHT - inlines to a literal, branch is eliminated.
export const DevPanel = __DEV__ ? DevPanelImpl : () => null;
```

This is not hypothetical. The first version of this feature used the imported
constant, and the panel's markup and strings shipped in the production bundle.
`check:no-dev-mode` caught it.

### Why it needs no maintenance

Dev mode does not carry a list of what to unlock. Every ownership question in the
app goes through `src/game/entitlements.ts` (`ownsItem`, `ownedItemIds`, `ownsSkin`,
`ownedSkinIds`, `adsRemoved`), and those answer "yes" to everything while dev mode is
active, deriving the full set from the catalogs. **A shop item or skin added later is
covered automatically.** The rule that keeps this true: nothing outside
`entitlements.ts` and `store.ts` may read `purchasedAddOns`, `ownedSkins`, or
`noAdsPurchased` directly.

### If you need it in a TestFlight build

TestFlight builds are release builds, so `__DEV__` is false and dev mode is off. Do
not relax the gate. Use the documented `EXPO_PUBLIC_ENABLE_DEV_MODE` opt-in in
`devMode.ts`, set it on the internal EAS profile only, and never on production.

---

## Known traps

### Never put a gesture on the animated sprite

The tap stage in `app/(tabs)/index.tsx` is **two sibling layers**, and they must
stay separate:

| Layer | What it is | Rule |
|---|---|---|
| Sprite | `Animated.View` with `pointerEvents="none"` | Moves and squishes. Can never receive a touch. |
| Target | Plain `Pressable`, `absoluteFill`, no children, no transform, only `onPress` | The sole thing the player touches. Never animated. |

An earlier build made the animated sprite itself the interactive node. The gesture
responder then treated finger movement as a drag on the sprite and swallowed the
press, so **taps silently stopped producing goo** — no error, no crash, the
animation still played.

So: never attach a `Pressable`, responder, or gesture to the animated sprite, and
never animate the touch target. The idle bob and the tap squish also use two
separate `Animated.Value`s so neither can interrupt the other.

There is a regression test for this — it fires press-move-release with a few pixels
of wobble (the exact gesture that used to break) and asserts every one still counts.
If you restructure this screen, re-run that check.

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
| Tap-not-drag regression (press-move-release) | Verified in browser — 5/5 registered |
| Character cards, backdrop switching | Verified in browser |
| v2 → v3 save migration (retired ids dropped) | Verified in browser |
| Shop purchases: identity, skins, boost, bundle | Verified in browser |
| Timed boost raises live output (6/s → 12/s) | Verified in browser |
| Coming Soon rows are not purchasable | Verified in browser |
| Tapping adds goo (fresh and mid-game saves) | Verified in browser |
| Last roster item + shop footnote clear the tab bar | Verified in browser |
| Splash -> onboarding -> named farm applied | Verified in browser |
| Dev mode: code on/off, unlock-all, revert | Verified in browser |
| Dev mode absent from production bundles (iOS + Android) | Verified — 0 markers |
| check:no-dev-mode fails on a weakened gate | Verified |
| Save persistence across reload | Verified in browser |
| Shop purchase flow | Verified in browser |
| Offline earnings math | Verified in browser |
| Streak: start, continue, reset after a miss, one claim/day | Verified in browser |
| Daily/weekly rollover clears counters and claims | Verified in browser |
| All four rewards claim once, credit goo, then block re-claim | Verified in browser |
| Welcome-back bonus: none under 30 min, 50% at 5h, capped at 20h | Verified in browser |
| v5 → v6 save migration (daily fields seeded) | Verified in browser |
| Pity timer forces a spawn; catch pays and clears | Verified in browser |
| Catch target does not swallow taps (5/5 with wobble) | Verified in browser |
| Double-catch blocked once the visitor is gone | Verified in browser |
| Bonus round: scoring, cooldown, no double payout | Verified in browser |
| Sweep/band/variance/weighting maths | Unit tested — 22/22 pass |
| Visitor weights land on 70.4 / 24.6 / 5.1 over 200k draws | Unit tested |
| Feed raises production exactly +25% (25.4 → 31.8/s) | Verified in browser |
| Care re-press refused while on cooldown | Verified in browser |
| v6 → v7 migration backfills 15 achievements, marks seen | Verified in browser |
| Achievement perks reach the live production figure | Verified in browser |
| Offline summary waits for the splash, lands on dashboard | Verified in browser |
| Six tabs still legible at 390px | Verified in browser |
| On a physical device | **Not yet** |

Everything above was exercised in a real browser against the web build, plus a compile
check of the iOS bundle. **Nothing has been run on actual hardware yet** — no simulator, no
phone. Haptics and the native tab-bar blur in particular have no browser equivalent and are
genuinely unverified. First device run is the obvious next step.
