import { useCallback, useEffect, useRef, useState } from 'react';

import { EyeState } from './slimeLook';

const TICK_MS = 320;
const BLINK_MS = 150;

/**
 * Drives the three eye states from activity alone:
 *
 *   asleep  -> resting, nothing has happened for `awakeMs`
 *   roused  -> woken by `rouse()`, i.e. the player tapped
 *   blink   -> a brief closure that only happens while awake
 *
 * This is state only. It never touches layout or gestures, so it is safe to
 * use from a purely decorative sprite layer.
 */
export function useSlimeEyes(awakeMs = 2600) {
  const [eyes, setEyes] = useState<EyeState>('asleep');
  const awakeUntil = useRef(0);
  const blinkUntil = useRef(0);

  const rouse = useCallback(() => {
    awakeUntil.current = Date.now() + awakeMs;
    blinkUntil.current = 0;
    setEyes('roused');
  }, [awakeMs]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();

      if (now < blinkUntil.current) return;

      if (now >= awakeUntil.current) {
        setEyes((prev) => (prev === 'asleep' ? prev : 'asleep'));
        return;
      }

      // Awake: blink occasionally so the idle pose has some life in it.
      if (Math.random() < 0.16) {
        blinkUntil.current = now + BLINK_MS;
        setEyes('blink');
        setTimeout(() => setEyes('roused'), BLINK_MS);
      } else {
        setEyes((prev) => (prev === 'roused' ? prev : 'roused'));
      }
    }, TICK_MS);

    return () => clearInterval(interval);
  }, []);

  return { eyes, rouse };
}
