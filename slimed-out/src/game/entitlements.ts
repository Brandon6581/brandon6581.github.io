import { SHOP_ITEMS } from './shopData';
import { SLIME_SKINS } from './skinData';
import { GameState } from './types';

/**
 * The single place anything asks "does the player own this?".
 *
 * Nothing else in the app should read `purchasedAddOns`, `ownedSkins` or
 * `noAdsPurchased` directly. Routing every check through here buys two things:
 *
 *  - Developer testing mode extends itself. These selectors answer "yes" to
 *    everything while it is active, derived from the catalog, so a shop item
 *    added next month is covered without touching this file or any list.
 *  - There is exactly one seam to audit for the release gate, rather than a
 *    dozen scattered `.includes()` calls.
 */

type EntitlementState = Pick<
  GameState,
  'purchasedAddOns' | 'ownedSkins' | 'noAdsPurchased' | 'devModeEnabled'
>;

/**
 * Direct `__DEV__` test on purpose: it inlines to a literal here, so a release
 * build reduces this to `false` and ignores the persisted flag entirely. A
 * hand-edited save with devModeEnabled: true grants nothing in production.
 */
function devActive(state: EntitlementState): boolean {
  return __DEV__ && state.devModeEnabled;
}

/** Every purchasable shop item id, derived from the catalog. */
function allPurchasableItemIds(): string[] {
  return SHOP_ITEMS.filter((i) => i.status === 'available').map((i) => i.id);
}

/** Does the player own this shop item? */
export function ownsItem(state: EntitlementState, itemId: string): boolean {
  if (devActive(state)) return true;
  return state.purchasedAddOns.includes(itemId);
}

/** Shop item ids the player is entitled to. Callers must not assume ordering. */
export function ownedItemIds(state: EntitlementState): string[] {
  if (devActive(state)) return allPurchasableItemIds();
  return state.purchasedAddOns;
}

/** Does the player own this collectible skin? */
export function ownsSkin(state: EntitlementState, skinId: string): boolean {
  if (devActive(state)) return true;
  return state.ownedSkins.includes(skinId);
}

/**
 * Skin ids the player is entitled to. In dev mode this includes the rare
 * golden variant, so testing never has to wait on its drop odds.
 */
export function ownedSkinIds(state: EntitlementState): string[] {
  if (devActive(state)) return SLIME_SKINS.map((s) => s.id);
  return state.ownedSkins;
}

/** Should interstitials be suppressed? */
export function adsRemoved(state: EntitlementState): boolean {
  if (devActive(state)) return true;
  return state.noAdsPurchased;
}
