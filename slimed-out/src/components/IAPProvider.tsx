import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

import { useGameStore } from '@/src/game/store';
import { createMockIAPService, getProductCatalog, NO_ADS_PRODUCT_ID } from '@/src/services/iapService';

import { PurchaseModal } from './PurchaseModal';

interface IAPContextValue {
  /** Resolves true if the purchase completed. Grants the entitlement on success. */
  buy: (productId: string) => Promise<boolean>;
  /** Re-grants any previously purchased non-consumables (e.g. after a reinstall). */
  restore: () => Promise<number>;
}

const IAPContext = createContext<IAPContextValue | null>(null);

export function IAPProvider({ children }: { children: React.ReactNode }) {
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const confirm = useCallback((productId: string) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setPendingProductId(productId);
    });
  }, []);

  const iapService = useMemo(() => createMockIAPService(confirm), [confirm]);

  const resolveModal = useCallback((confirmed: boolean) => {
    setPendingProductId(null);
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
  }, []);

  const buy = useCallback(
    async (productId: string) => {
      const result = await iapService.purchase(productId);
      if (result.success) {
        if (productId === NO_ADS_PRODUCT_ID) {
          useGameStore.getState().grantNoAds();
        } else {
          useGameStore.getState().grantAddOn(productId);
        }
      }
      return result.success;
    },
    [iapService]
  );

  const restore = useCallback(async () => {
    const addOnIds = await iapService.restorePurchases();
    const noAds = addOnIds.includes(NO_ADS_PRODUCT_ID);
    useGameStore.getState().restoreEntitlements(addOnIds.filter((id) => id !== NO_ADS_PRODUCT_ID), noAds);
    return addOnIds.length;
  }, [iapService]);

  const value = useMemo(() => ({ buy, restore }), [buy, restore]);

  const product = pendingProductId
    ? getProductCatalog().find((p) => p.id === pendingProductId) ?? null
    : null;

  return (
    <IAPContext.Provider value={value}>
      {children}
      <PurchaseModal
        visible={pendingProductId != null}
        productName={product?.name ?? null}
        price={product?.price ?? null}
        onConfirm={() => resolveModal(true)}
        onCancel={() => resolveModal(false)}
      />
    </IAPContext.Provider>
  );
}

export function useIAP(): IAPContextValue {
  const ctx = useContext(IAPContext);
  if (!ctx) throw new Error('useIAP must be used within an IAPProvider');
  return ctx;
}
