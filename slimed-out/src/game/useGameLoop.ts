import { useCallback, useEffect, useRef } from 'react';
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
 *
 * `claimReady` gates the *cold start* claim only. The studio splash owns the
 * screen for its first couple of seconds, and the welcome-back summary is
 * supposed to land on the dashboard afterwards rather than animate in behind an
 * opaque overlay where nobody sees it. Ticking is deliberately not gated: the
 * game runs underneath the splash, so it is warm by the time the overlay
 * clears. Resume-from-background claims are never gated, because the splash
 * does not replay on resume.
 */
export function useGameLoop(
  onOfflineEarnings: (result: OfflineResult) => void,
  claimReady: boolean = true
) {
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const onOfflineEarningsRef = useRef(onOfflineEarnings);
  onOfflineEarningsRef.current = onOfflineEarnings;
  const coldStartClaimed = useRef(false);

  const claim = useCallback(() => {
    const result = useGameStore.getState().claimOfflineEarnings();
    if (result) onOfflineEarningsRef.current(result);
  }, []);

  // Cold start: wait for both the save to load and the splash to finish.
  useEffect(() => {
    if (!claimReady || coldStartClaimed.current) return;

    if (useGameStore.persist.hasHydrated()) {
      coldStartClaimed.current = true;
      claim();
      return;
    }

    const unsub = useGameStore.persist.onFinishHydration(() => {
      coldStartClaimed.current = true;
      claim();
      unsub();
    });
    return unsub;
  }, [claimReady, claim]);

  useEffect(() => {
    const interval = setInterval(() => {
      useGameStore.getState().tick(TICK_MS / 1000);
    }, TICK_MS);

    const sub = AppState.addEventListener('change', (next) => {
      const prev = appState.current;
      appState.current = next;
      if (next === 'background' || next === 'inactive') {
        useGameStore.getState().touchSave();
      } else if (next === 'active' && (prev === 'background' || prev === 'inactive')) {
        // A resume always claims: the splash is long gone by now.
        coldStartClaimed.current = true;
        claim();
      }
    });

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [claim]);
}
