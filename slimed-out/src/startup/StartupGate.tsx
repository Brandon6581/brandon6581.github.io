import { useCallback, useState } from 'react';

import { useGameStore } from '@/src/game/store';

import { BrandSplash } from './BrandSplash';
import { Onboarding } from './Onboarding';

type Phase = 'brand' | 'onboarding' | 'ready';

/**
 * Owns what the player sees before the game itself: the studio card on every
 * launch, then first-run onboarding.
 *
 * Rendered as an overlay above the navigator rather than as its own route, so
 * the tab tree never has to know about it and there is no navigation state to
 * unwind when it finishes.
 */
export function StartupGate({ children }: { children: React.ReactNode }) {
  const onboardingComplete = useGameStore((s) => s.onboardingComplete);
  const completeOnboarding = useGameStore((s) => s.completeOnboarding);
  const hasHydrated = useGameStore.persist.hasHydrated();
  const [phase, setPhase] = useState<Phase>('brand');

  const handleBrandDone = useCallback(() => {
    setPhase('onboarding');
  }, []);

  const handleFinish = useCallback(
    (farm: string, display: string) => {
      completeOnboarding(farm, display);
      setPhase('ready');
    },
    [completeOnboarding]
  );

  // The game renders underneath throughout, so it is warm and ticking by the
  // time the overlay clears.
  return (
    <>
      {children}
      {phase === 'brand' && <BrandSplash onDone={handleBrandDone} />}
      {/* Wait for the save to load before deciding - otherwise a returning
          player briefly gets sent through first-run onboarding. */}
      {phase === 'onboarding' && hasHydrated && !onboardingComplete && (
        <Onboarding onFinish={handleFinish} />
      )}
    </>
  );
}
