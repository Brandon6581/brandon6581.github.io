import { Animated, Easing, StyleSheet } from 'react-native';

import { theme } from '@/src/theme';
import { formatNumber } from '@/src/utils/format';

/**
 * A value that drifts up from wherever the finger landed and fades out.
 *
 * Three things are deliberate here:
 *
 * **It is decorative and says so.** The whole layer renders inside a
 * `pointerEvents="none"` container on the tap stage, so a floater drifting
 * across the slime can never intercept the next tap. That is the same rule the
 * sprite follows (see the header comment on the tap screen) and it applies to
 * anything that moves over the touch target.
 *
 * **It unmounts itself.** The animation's completion callback removes the node
 * from the tree; nothing polls and nothing accumulates. A player holding down a
 * rapid tap still ends with an empty list a second after they stop. This is the
 * whole leak story - an `Animated.Value` and its listeners are garbage once the
 * component goes, and the component goes when the timing finishes.
 *
 * **Only transform and opacity are animated.** Both are handled by the native
 * animated module. Animating a layout property such as `left` under
 * `useNativeDriver: true` throws on device (and, confusingly, works fine on
 * react-native-web, which ignores the flag). Position is set once, statically,
 * and all motion is a transform on top of it.
 */

export type FloaterVariant = 'tap' | 'crit';

export interface FloaterStyle {
  color: string;
  fontSize: number;
  /** How far it travels, in px. */
  rise: number;
  durationMs: number;
}

/**
 * Baseline for ordinary goo taps, and a louder one for rare hits. A crit is
 * bigger, gold, travels further and lingers - it should read as a different
 * kind of event across the room, not as a slightly larger number.
 */
export const FLOATER_STYLES: Record<FloaterVariant, FloaterStyle> = {
  tap: { color: theme.accentGreen, fontSize: 20, rise: 86, durationMs: 800 },
  crit: { color: theme.accentGold, fontSize: 34, rise: 128, durationMs: 1200 },
};

/**
 * Ceiling on simultaneous floaters. A fast tapper on a big screen can fire
 * ten-plus taps a second, and every one of those is a mounted animated node.
 * Dropping the oldest keeps the tree bounded without ever blocking a tap - the
 * goo is already banked by the time this renders.
 */
export const MAX_FLOATERS = 14;

export interface Floater {
  id: number;
  /** Rendered as a signed, formatted number unless `label` overrides it. */
  value: number;
  /** Shown instead of the number, for rewards that are not goo. */
  label?: string;
  /** Where the finger was, in pixels within the tap stage. */
  x: number;
  y: number;
  /** Horizontal drift, so repeated taps in one spot do not stack exactly. */
  drift: number;
  style: FloaterStyle;
  anim: Animated.Value;
}

export interface FloaterOptions {
  variant?: FloaterVariant;
  /** Per-call overrides on top of the variant, for one-off colours. */
  color?: string;
  /** Multiplies the variant's font size and rise together. */
  scale?: number;
  label?: string;
}

let nextId = 0;

/** Builds a floater at a touch point, with its animation ready to start. */
export function makeFloater(
  value: number,
  x: number,
  y: number,
  options: FloaterOptions = {}
): Floater {
  const base = FLOATER_STYLES[options.variant ?? 'tap'];
  const scale = options.scale ?? 1;
  return {
    id: nextId++,
    value,
    label: options.label,
    x,
    y,
    drift: (Math.random() - 0.5) * 26,
    style: {
      color: options.color ?? base.color,
      fontSize: base.fontSize * scale,
      rise: base.rise * scale,
      durationMs: base.durationMs,
    },
    anim: new Animated.Value(0),
  };
}

/**
 * Runs a floater's drift-and-fade. `onDone` is what unmounts it, so a caller
 * that drops this callback leaks the node - always pass one.
 */
export function runFloater(floater: Floater, onDone: () => void): void {
  Animated.timing(floater.anim, {
    toValue: 1,
    duration: floater.style.durationMs,
    easing: Easing.out(Easing.quad),
    useNativeDriver: true,
  }).start(onDone);
}

export function FloatingValue({ floater }: { floater: Floater }) {
  const { color, fontSize, rise } = floater.style;

  const translateY = floater.anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -rise],
  });
  const translateX = floater.anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, floater.drift],
  });
  const opacity = floater.anim.interpolate({
    inputRange: [0, 0.65, 1],
    outputRange: [1, 0.85, 0],
  });
  // A small punch on the way out of the finger, settling back to full size.
  const scale = floater.anim.interpolate({
    inputRange: [0, 0.18, 1],
    outputRange: [0.85, 1.08, 1],
  });

  const text =
    floater.label ?? `${floater.value >= 0 ? '+' : '-'}${formatNumber(Math.abs(floater.value))}`;

  // No pointerEvents prop needed: the whole floater layer already sits inside a
  // pointer-events-none container on the stage.
  return (
    <Animated.Text
      style={[
        styles.text,
        {
          left: floater.x,
          top: floater.y,
          color,
          fontSize,
          opacity,
          transform: [{ translateX }, { translateY }, { scale }],
        },
      ]}
    >
      {text}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  text: {
    position: 'absolute',
    // Centred on the finger rather than starting at it: a number that begins
    // to the lower-right of the touch reads as offset, not as coming from it.
    marginLeft: -90,
    marginTop: -16,
    width: 180,
    textAlign: 'center',
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowRadius: 5,
  },
});
