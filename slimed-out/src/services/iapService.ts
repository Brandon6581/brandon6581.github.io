import { NO_ADS_PRICE, SHOP_ITEMS } from '@/src/game/shopData';
import { IAPProductDef } from '@/src/game/types';

/**
 * In-app purchase abstraction.
 *
 * This app ships with a `MockIAPService` that simulates App Store /
 * Play Store purchase sheets with an in-app confirmation modal, so the
 * whole shop UX can be built and tested without store credentials. To
 * go live:
 *
 *   1. `npx expo install react-native-iap` (requires an EAS/custom dev
 *      client build - it will not run in Expo Go).
 *   2. Create matching one-time (non-consumable) product IDs in App Store
 *      Connect and the Play Console: `slimed_out_no_ads` ($0.99), plus one
 *      product per purchasable id in shopData.ts at its listed price.
 *   3. Implement `IAPService` using `initConnection`, `getProducts`,
 *      `requestPurchase`, and `finishTransaction` from that package, and
 *      swap it in wherever `createMockIAPService` is constructed today
 *      (see `components/IAPProvider.tsx`). Use the store's own localized
 *      price strings there instead of `formatPrice` below.
 *   4. Verify receipts server-side before granting entitlements for a
 *      production release; the mock and the client-only wiring here are
 *      for development.
 */

export const NO_ADS_PRODUCT_ID = 'slimed_out_no_ads';

export function getProductCatalog(): IAPProductDef[] {
  return [
    {
      id: NO_ADS_PRODUCT_ID,
      name: 'Remove Ads',
      description: 'Removes interstitial ad breaks for good. One-time purchase.',
      price: NO_ADS_PRICE,
      kind: 'noAds',
    },
    // Coming Soon entries are intentionally excluded - they have no price
    // and must never reach a real store as a product.
    ...SHOP_ITEMS.filter((a) => a.status === 'available' && a.price != null).map((a) => ({
      id: a.id,
      name: a.name,
      description: a.blurb,
      price: a.price as number,
      kind: 'addOn' as const,
    })),
  ];
}

export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

export interface PurchaseResult {
  productId: string;
  success: boolean;
}

export interface IAPService {
  purchase: (productId: string) => Promise<PurchaseResult>;
  restorePurchases: () => Promise<string[]>;
}

/** Simulates a payment sheet; the actual confirmation UI lives in PurchaseModal. */
export function createMockIAPService(confirm: (productId: string) => Promise<boolean>): IAPService {
  return {
    purchase: async (productId: string) => {
      const success = await confirm(productId);
      return { productId, success };
    },
    restorePurchases: async () => {
      // A real implementation would query the store for the account's
      // previously-purchased non-consumables. The mock has nothing to
      // restore since it never left the device.
      return [];
    },
  };
}
