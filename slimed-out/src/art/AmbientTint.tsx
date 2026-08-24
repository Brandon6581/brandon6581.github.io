import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';

import {
  AmbiencePhase,
  currentPhase,
  msUntilNextPhase,
} from '@/src/game/ambience';

/**
 * The time-of-day tint that sits over the illustrated backdrop.
 *
 * **It cross-fades opacity, never colour.** Animating a gradient's colours (or
 * any `backgroundColor`) cannot run on the native driver - see the note in
 * AGENTS.md, and the bonus-round marker that shipped exactly that bug. Instead
 * two full-size gradients are stacked and the top one's *opacity* is animated,
 * which the native driver handles happily. The result is the same visual
 * cross-fade with none of the risk.
 *
 * Purely decorative, so the whole thing is pointer-events-none and can never
 * intercept a tap meant for the slime underneath.
 */

/** Long enough to read as a change of light rather than a flicker. */
const FADE_MS = 1400;

export function AmbientTint() {
  const [phase, setPhase] = useState<AmbiencePhase>(() => currentPhase());
  const [previous, setPrevious] = useState<AmbiencePhase | null>(null);
  const fade = useRef(new Animated.Value(1)).current;

  // Wake exactly at the next boundary rather than polling every minute. The
  // timer is re-armed on each change, so it also survives the app being open
  // across several phases.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const schedule = () => {
      timer = setTimeout(() => {
        const next = currentPhase();
        setPhase((current) => {
          if (next.id === current.id) return current;
          setPrevious(current);
          return next;
        });
        schedule();
      }, msUntilNextPhase());
    };

    schedule();
    return () => clearTimeout(timer);
  }, []);

  // Fade the incoming phase in over whatever was showing before.
  useEffect(() => {
    if (!previous) return;
    fade.setValue(0);
    const anim = Animated.timing(fade, {
      toValue: 1,
      duration: FADE_MS,
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (finished) setPrevious(null);
    });
    return () => anim.stop();
  }, [phase.id, previous, fade]);

  return (
    <>
      {previous && (
        <LinearGradient
          pointerEvents="none"
          colors={previous.gradient}
          style={StyleSheet.absoluteFill}
        />
      )}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { opacity: previous ? fade : 1 }]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={phase.gradient}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </>
  );
}
