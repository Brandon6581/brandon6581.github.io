import { Animated, Easing, StyleSheet, TextStyle } from 'react-native';

import { theme } from '@/src/theme';
import { formatNumber } from '@/src/utils/format';

/**
 * A number that drifts up from wherever the finger landed and fades out.
 *
 * Two things are deliberate here:
 *
 * **It is decorative and says so.** The whole layer renders inside a
 * `pointerEvents="none"` container on the tap stage, so a floater drifting
 * across the slime can never intercept the next tap. That is the same rule the
 * sprite follows (see the header comment on the tap screen) and it applies to
 * anything that moves over the touch target.
 *
 * **It unmounts itself.** The animation's completion callback is what removes
 * the node; nothing polls and nothing accumulates. A player holding down a
 * rapid tap still ends with an empty list a second after they stop.
 */

export const FLOAT_DURATION_MS = 800;
/**
 * Ceiling on simultaneous floaters. A fast tapper on a big screen can fire
 * ten-plus taps a second, and every one of those is a mounted animated node.
 * Dropping the oldest keeps the tree bounded without ever blocking a tap - the
 * goo is already banked by the time this renders.
 */
export const MAX_FLOATERS = 14;

export interface Floater {
  id: number;
  value: number;
  /** Where the finger was, in pixels within the tap stage. */
  x: number;
  y: number;
  /** Horizontal drift, so repeated taps in one spot do not stack exactly. */
  drift: number;
  anim: Animated.Value;
}

let nextId = 0;

/** Builds a floater at a touch point, with its animation ready to start. */
export function makeFloater(value: number, x: number, y: number): Floater {
  return {
    id: nextId++,
    value,
    x,
    y,
    drift: (Math.random() - 0.5) * 26,
    anim: new Animated.Value(0),
  };
}

/** Runs a floater's drift-and-fade, calling `onDone` when it should unmount. */
export function runFloater(floater: Floater, onDone: () => void): void {
  Animated.timing(floater.anim, {
    toValue: 1,
    duration: FLOAT_DURATION_MS,
    easing: Easing.out(Easing.quad),
    useNativeDriver: true,
  }).start(onDone);
}

export function FloatingValue({ floater, style }: { floater: Floater; style?: TextStyle }) {
  const translateY = floater.anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -86],
  });
  const translateX = floater.anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, floater.drift],
  });
  const opacity = floater.anim.interpolate({
    inputRange: [0, 0.65, 1],
    outputRange: [1, 0.85, 0],
  });
  const scale = floater.anim.interpolate({
    inputRange: [0, 0.18, 1],
    outputRange: [0.85, 1.08, 1],
  });

  return (
    // No pointerEvents prop needed: the whole floater layer already sits
    // inside a pointer-events-none container on the stage.
    <Animated.Text
      style={[
        styles.text,
        style,
        {
          left: floater.x,
          top: floater.y,
          opacity,
          transform: [{ translateX }, { translateY }, { scale }],
        },
      ]}
    >
      {floater.value >= 0 ? '+' : '-'}
      {formatNumber(Math.abs(floater.value))}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  text: {
    position: 'absolute',
    // Centred on the finger rather than starting at it: a number that begins
    // to the lower-right of the touch reads as offset, not as coming from it.
    marginLeft: -50,
    marginTop: -14,
    width: 100,
    textAlign: 'center',
    color: theme.accentGreen,
    fontSize: 20,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowRadius: 5,
  },
});
