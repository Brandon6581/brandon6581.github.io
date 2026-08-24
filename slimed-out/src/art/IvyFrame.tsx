import { StyleSheet, View } from 'react-native';
import Svg, { Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';

/**
 * Gold-leaf ivy framing the tap stage.
 *
 * Each corner is a fixed-size square SVG rather than one stretched full-stage
 * SVG: stretching a square viewBox across a wide, short stage distorts the
 * leaves and blows up their apparent size. Fixed corners keep the drawing in
 * proportion and keep it small.
 *
 * Purely decorative - `pointerEvents="none"`, rendered beneath the sprite and
 * the labels, and kept to the corners so it never crosses the slime or text.
 */

const CORNER = 78;
const INSET = 2;

function Sprig() {
  return (
    <Svg width={CORNER} height={CORNER} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="ivyGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0" stopColor="#F3DFA0" stopOpacity={0.7} />
          <Stop offset="0.55" stopColor="#CFA64B" stopOpacity={0.62} />
          <Stop offset="1" stopColor="#8E6E28" stopOpacity={0.5} />
        </LinearGradient>
      </Defs>
      <G>
        <Path
          d="M4 62 C18 56 30 42 38 24 C42 15 50 8 62 5"
          stroke="url(#ivyGold)"
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
        />
        <Path d="M24 44 C16 40 9 42 5 48 C13 53 20 50 24 44 Z" fill="url(#ivyGold)" />
        <Path d="M31 32 C30 22 34 15 42 11 C45 21 41 28 31 32 Z" fill="url(#ivyGold)" opacity={0.9} />
        <Path d="M46 16 C43 9 45 3 51 0 C55 7 53 13 46 16 Z" fill="url(#ivyGold)" opacity={0.8} />
        <Path d="M13 56 C9 53 5 53 2 56 C6 60 10 60 13 56 Z" fill="url(#ivyGold)" opacity={0.6} />
        <Path
          d="M58 8 C65 6 70 8 70 12"
          stroke="url(#ivyGold)"
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          opacity={0.6}
        />
      </G>
    </Svg>
  );
}

export function IvyFrame() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.corner, styles.tl]}>
        <Sprig />
      </View>
      <View style={[styles.corner, styles.tr]}>
        <Sprig />
      </View>
      <View style={[styles.corner, styles.bl]}>
        <Sprig />
      </View>
      <View style={[styles.corner, styles.br]}>
        <Sprig />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  corner: { position: 'absolute', width: CORNER, height: CORNER },
  tl: { top: INSET, left: INSET },
  tr: { top: INSET, right: INSET, transform: [{ scaleX: -1 }] },
  bl: { bottom: INSET, left: INSET, transform: [{ scaleY: -1 }] },
  br: { bottom: INSET, right: INSET, transform: [{ scaleX: -1 }, { scaleY: -1 }] },
});
