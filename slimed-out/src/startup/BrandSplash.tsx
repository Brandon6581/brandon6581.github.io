import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

/**
 * Studio card shown on launch: white on red, with a small original slime mark.
 *
 * Deliberately plain type and an original drawn glyph - nothing borrowed from
 * any existing studio's identity.
 */
export function BrandSplash({ onDone }: { onDone: () => void }) {
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const seq = Animated.sequence([
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: 650,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(rise, {
          toValue: 1,
          duration: 750,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(900),
      Animated.timing(out, {
        toValue: 0,
        duration: 500,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    seq.start(({ finished }) => {
      if (finished) onDone();
    });
    return () => seq.stop();
  }, [fade, rise, out, onDone]);

  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });

  return (
    <Animated.View
      style={[styles.fill, { opacity: out }]}
      accessible
      accessibilityLabel="Norseth Enterprises"
    >
      <Animated.View style={[styles.center, { opacity: fade, transform: [{ translateY }] }]}>
        <Svg width={92} height={92} viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="brandBody" x1="25%" y1="0%" x2="75%" y2="100%">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.98} />
              <Stop offset="1" stopColor="#FFD9D4" stopOpacity={0.92} />
            </LinearGradient>
            <RadialGradient id="brandGloss" cx="36%" cy="28%" r="34%">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.95} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Path
            d="M18 74 C18 44 32 22 50 22 C68 22 82 44 82 74 C82 80 78 83 72 82.5 C66 82 62 85 54 84.5 C46 84 42 82 34 82.5 C26 83 18 80 18 74 Z"
            fill="url(#brandBody)"
          />
          <Ellipse cx={38} cy={40} rx={15} ry={11} fill="url(#brandGloss)" />
          <Circle cx={40} cy={58} r={4.2} fill="#B3201B" />
          <Circle cx={60} cy={58} r={4.2} fill="#B3201B" />
          <Path
            d="M44 69 C46.5 72.5 53.5 72.5 56 69"
            stroke="#B3201B"
            strokeWidth={2.6}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>

        <Text style={styles.wordmark}>NORSETH</Text>
        <Text style={styles.wordmarkSub}>ENTERPRISES</Text>
        <View style={styles.rule} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#B3201B',
    alignItems: 'center',
    justifyContent: 'center',
    // Explicit stacking: the overlay shares a stacking level with the game
    // underneath, so DOM order alone is not a guarantee it paints on top.
    zIndex: 100,
    elevation: 100,
  },
  center: { alignItems: 'center', gap: 2 },
  wordmark: {
    marginTop: 18,
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 6,
  },
  wordmarkSub: {
    color: '#FFE3E0',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 7,
  },
  rule: {
    marginTop: 14,
    width: 54,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
});
