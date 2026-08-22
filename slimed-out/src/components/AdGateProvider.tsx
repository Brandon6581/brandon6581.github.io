import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

import { createDevAdService, shouldShowInterstitial } from '@/src/services/adService';
import { adsRemoved } from '@/src/game/entitlements';
import { useGameStore } from '@/src/game/store';

import { AdModal } from './AdModal';

interface AdGateContextValue {
  /** Call at natural break points (tab focus, after a purchase, etc). No-op if not due. */
  maybeShowAd: () => Promise<void>;
}

const AdGateContext = createContext<AdGateContextValue | null>(null);

export function AdGateProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const sessionStartedAt = useRef(Date.now());
  const resolverRef = useRef<(() => void) | null>(null);

  const presentModal = useCallback(() => {
    return new Promise<void>((resolve) => {
      resolverRef.current = resolve;
      setVisible(true);
    });
  }, []);

  const adService = useMemo(() => createDevAdService(presentModal), [presentModal]);

  const handleClose = useCallback(() => {
    setVisible(false);
    useGameStore.getState().markAdShown();
    resolverRef.current?.();
    resolverRef.current = null;
  }, []);

  const maybeShowAd = useCallback(async () => {
    const state = useGameStore.getState();
    const due = shouldShowInterstitial(
      {
        noAdsPurchased: adsRemoved(state),
        lifetimeGoo: state.lifetimeGoo,
        lastAdShownAt: state.lastAdShownAt,
        sessionStartedAt: sessionStartedAt.current,
      },
      Date.now()
    );
    if (!due || visible) return;
    await adService.showInterstitial();
  }, [adService, visible]);

  const value = useMemo(() => ({ maybeShowAd }), [maybeShowAd]);

  return (
    <AdGateContext.Provider value={value}>
      {children}
      <AdModal visible={visible} onClose={handleClose} />
    </AdGateContext.Provider>
  );
}

export function useAdGate(): AdGateContextValue {
  const ctx = useContext(AdGateContext);
  if (!ctx) throw new Error('useAdGate must be used within an AdGateProvider');
  return ctx;
}
