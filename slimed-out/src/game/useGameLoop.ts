import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { useGameStore } from './store';
import { OfflineResult } from './types';

const TICK_MS = 1000;

/**
 * Drives the idle production loop and persistence lifecycle:
 * - ticks goo production once per second while the app is foregrounded
 * - saves a timestamp when the app is backgrounded
 * - computes and reports offline earnings on cold start and on
 *   background -> foreground transitions
 */
export function useGameLoop(onOfflineEarnings: (result: OfflineResult) => void) {
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const onOfflineEarningsRef = useRef(onOfflineEarnings);
  onOfflineEarningsRef.current = onOfflineEarnings;

  useEffect(() => {
    const claim = () => {
      const result = useGameStore.getState().claimOfflineEarnings();
      if (result) onOfflineEarningsRef.current(result);
    };

    if (useGameStore.persist.hasHydrated()) {
      claim();
    } else {
      const unsub = useGameStore.persist.onFinishHydration(() => {
        claim();
        unsub();
      });
    }

    const interval = setInterval(() => {
      useGameStore.getState().tick(TICK_MS / 1000);
    }, TICK_MS);

    const sub = AppState.addEventListener('change', (next) => {
      const prev = appState.current;
      appState.current = next;
      if (next === 'background' || next === 'inactive') {
        useGameStore.getState().touchSave();
      } else if (next === 'active' && (prev === 'background' || prev === 'inactive')) {
        claim();
      }
    });

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, []);
}
