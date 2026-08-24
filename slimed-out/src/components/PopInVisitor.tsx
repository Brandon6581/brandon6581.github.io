import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { SlimeSprite } from '@/src/art/SlimeSprite';
import { RareVisitorDef, VISITOR_WARNING_MS } from '@/src/game/eventData';
import { SLIME_BY_ID } from '@/src/game/slimeData';

/**
 * ============================================================================
 * The visitor uses the SAME two-layer rule as the main tap stage.
 * ============================================================================
 * Layer 1 (visual)  An Animated.View with `pointerEvents="none"`. It scales in,
 *                   bobs, and blinks a warning before leaving. It can never
 *                   receive or swallow a touch.
 *
 * Layer 2 (target)  A plain Pressable, no transform, no children that animate,
 *                   only `onPress`.
 *
 * This matters more here than anywhere else in the app: the obvious way to
 * write this component is a `TouchableOpacity` nested inside the animated
 * wrapper, which is exactly the arrangement that broke tapping once already -
 * the responder treats finger movement as a drag on the animated node and eats
 * the press. Animated wrapper + touchable child is that same bug wearing a
 * different hat.
 *
 * The target is also deliberately SMALL and offset into a corner of the stage.
 * The main slime's Pressable fills the stage underneath, so anything outside
 * this little box still counts as a normal goo tap - a near miss on the visitor
 * is never a dead touch.
 * ============================================================================
 */

const VISITOR_SIZE = 92;

export function PopInVisitor({
  def,
  slimeId,
  expiresAt,
  onCatch,
}: {
  def: RareVisitorDef;
  slimeId: string;
  expiresAt: number;
  onCatch: () => void;
}) {
  const scale = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(1)).current;
  const bob = useRef(new Animated.Value(0)).current;

  // Placement is drawn once per visit and held: re-rolling on every render
  // would make the visitor jitter around the stage.
  const spot = useMemo(
    () => ({ top: 6 + Math.random() * 26, left: Math.random() > 0.5 }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slimeId, expiresAt]
  );

  const look = SLIME_BY_ID[slimeId]?.look ?? SLIME_BY_ID.basic.look;

  useEffect(() => {
    scale.setValue(0);
    blink.setValue(1);

    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 90,
      useNativeDriver: true,
    }).start();

    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    bobLoop.start();

    // Blink a warning once it is nearly time to go.
    const untilWarning = Math.max(0, expiresAt - Date.now() - VISITOR_WARNING_MS);
    const timer = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(blink, { toValue: 0.35, duration: 250, useNativeDriver: true }),
          Animated.timing(blink, { toValue: 1, duration: 250, useNativeDriver: true }),
        ])
      ).start();
    }, untilWarning);

    return () => {
      clearTimeout(timer);
      bobLoop.stop();
      blink.stopAnimation();
    };
  }, [scale, blink, bob, expiresAt]);

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const position: ViewStyle = spot.left
    ? { top: `${spot.top}%`, left: 14 }
    : { top: `${spot.top}%`, right: 14 };

  return (
    <View style={[styles.slot, position]} pointerEvents="box-none">
      {/* Layer 1: decorative only. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.visual, { opacity: blink, transform: [{ scale }, { translateY }] }]}
      >
        <View style={[styles.halo, { borderColor: def.accent, shadowColor: def.accent }]}>
          <SlimeSprite look={look} eyes="roused" size={VISITOR_SIZE - 22} seed={slimeId} />
        </View>
        <Text style={[styles.name, { color: def.accent }]} numberOfLines={1}>
          {def.name}
        </Text>
      </Animated.View>

      {/* Layer 2: the only interactive node. */}
      <Pressable
        style={styles.target}
        onPress={onCatch}
        accessibilityRole="button"
        accessibilityLabel={`Catch the ${def.name}. ${def.blurb}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    position: 'absolute',
    width: VISITOR_SIZE,
    alignItems: 'center',
    zIndex: 20,
  },
  visual: { alignItems: 'center' },
  halo: {
    width: VISITOR_SIZE,
    height: VISITOR_SIZE,
    borderRadius: VISITOR_SIZE / 2,
    borderWidth: 2,
    backgroundColor: 'rgba(10,14,12,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 8,
  },
  name: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowRadius: 4,
  },
  target: {
    ...StyleSheet.absoluteFillObject,
    // A little taller than the halo so the label is catchable too, but still
    // far smaller than the stage - everything outside it is a normal goo tap.
    height: VISITOR_SIZE + 18,
  },
});
