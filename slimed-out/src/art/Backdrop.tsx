import { useId, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AmbientTint } from './AmbientTint';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';

import { BackdropDef, BackdropShape, MoteStyle } from '@/src/game/backgroundData';

/**
 * A stationary illustrated scene that sits behind every screen. Deliberately
 * static - it is atmosphere, not motion, and animating it would compete with
 * the slimes for attention (and cost battery on a game people leave open).
 *
 * Rendered in a 100x100 viewBox scaled with `slice`, so it fills any aspect
 * ratio without letterboxing.
 */

/** Three silhouette bands per shape, ordered far to near. */
const SHAPE_BANDS: Record<BackdropShape, [string, string, string]> = {
  canopy: [
    'M0 0 L0 26 C12 20 18 30 28 24 C38 18 44 30 56 25 C68 20 76 31 88 25 C94 22 98 27 100 24 L100 0 Z',
    'M0 0 L0 15 C10 11 16 19 26 14 C36 9 43 18 54 13 C66 8 74 17 86 12 C93 9 97 14 100 11 L100 0 Z',
    'M0 100 L0 84 C10 88 16 80 26 85 C36 90 46 82 58 87 C70 92 80 84 90 88 C95 90 98 87 100 88 L100 100 Z',
  ],
  hills: [
    'M0 100 L0 68 C14 60 26 66 40 62 C56 57 68 64 82 60 C90 58 96 62 100 60 L100 100 Z',
    'M0 100 L0 78 C16 72 28 78 44 74 C60 70 72 76 86 72 C93 70 97 74 100 72 L100 100 Z',
    'M0 100 L0 88 C18 84 30 89 46 86 C62 83 74 88 88 85 C94 84 98 87 100 86 L100 100 Z',
  ],
  stalactites: [
    'M0 0 L100 0 L100 18 L94 8 L88 22 L80 6 L72 20 L64 9 L56 24 L48 7 L40 19 L32 8 L24 22 L16 7 L8 18 L0 9 Z',
    'M0 0 L100 0 L100 10 L92 4 L84 14 L76 3 L66 12 L58 4 L50 15 L42 4 L34 12 L26 3 L18 11 L10 4 L0 12 Z',
    'M0 100 L0 86 L8 94 L16 84 L26 92 L36 85 L46 93 L58 86 L68 93 L78 85 L88 92 L96 86 L100 90 L100 100 Z',
  ],
  horizon: [
    'M0 100 L0 58 C20 55 34 59 52 57 C70 55 84 58 100 56 L100 100 Z',
    'M0 100 L0 72 C18 69 32 73 50 71 C68 69 84 72 100 70 L100 100 Z',
    'M0 100 L0 86 C20 83 34 87 52 85 C70 83 84 86 100 84 L100 100 Z',
  ],
};

interface Mote {
  cx: number;
  cy: number;
  r: number;
  o: number;
}

function makeMotes(style: MoteStyle): Mote[] {
  // Hand-placed rather than random so the composition stays balanced and does
  // not reshuffle between renders.
  const spots: [number, number][] = [
    [12, 22], [24, 40], [37, 17], [46, 48], [58, 28],
    [67, 44], [74, 19], [83, 37], [91, 26], [18, 58],
    [31, 66], [52, 62], [70, 66], [88, 56], [42, 33],
  ];
  // Radii are deliberately tiny: `slice` scales this 100-unit viewBox up by
  // roughly 8x on a phone, so r=1 already lands near a 17px blob. These need to
  // read as atmosphere behind the UI, never as objects competing with it.
  return spots.map(([cx, cy], i) => {
    const t = (i % 5) / 5;
    switch (style) {
      case 'stars':
        return { cx, cy, r: 0.12 + t * 0.16, o: 0.4 + t * 0.45 };
      case 'bubbles':
        return { cx, cy, r: 0.22 + t * 0.3, o: 0.16 + t * 0.2 };
      case 'sparks':
        return { cx, cy, r: 0.1 + t * 0.18, o: 0.3 + t * 0.35 };
      case 'dust':
      default:
        return { cx, cy, r: 0.16 + t * 0.24, o: 0.14 + t * 0.2 };
    }
  });
}

export function Backdrop({ def, children }: { def: BackdropDef; children?: React.ReactNode }) {
  const rawId = useId();
  const uid = useMemo(() => rawId.replace(/[^a-zA-Z0-9]/g, ''), [rawId]);
  const motes = useMemo(() => makeMotes(def.motes), [def.motes]);
  const bands = SHAPE_BANDS[def.shape];

  const skyId = `sky${uid}`;
  const glowId = `glow${uid}`;
  const vignetteId = `vig${uid}`;

  return (
    <View style={styles.fill}>
      {/* width/height must be real Svg props - a style-only absoluteFill leaves
          react-native-svg sizing itself from the viewBox aspect ratio, which
          renders a square and lets the screen background show through below it. */}
      <Svg
        style={StyleSheet.absoluteFill}
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        <Defs>
          <LinearGradient id={skyId} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0" stopColor={def.sky[0]} />
            <Stop offset="0.55" stopColor={def.sky[1]} />
            <Stop offset="1" stopColor={def.sky[2]} />
          </LinearGradient>

          <RadialGradient
            id={glowId}
            cx={`${def.glow.x * 100}%`}
            cy={`${def.glow.y * 100}%`}
            r="55%"
          >
            <Stop offset="0" stopColor={def.glow.color} stopOpacity={0.32} />
            <Stop offset="0.5" stopColor={def.glow.color} stopOpacity={0.1} />
            <Stop offset="1" stopColor={def.glow.color} stopOpacity={0} />
          </RadialGradient>

          <RadialGradient id={vignetteId} cx="50%" cy="46%" r="72%">
            <Stop offset="0.55" stopColor="#000000" stopOpacity={0} />
            <Stop offset="1" stopColor="#000000" stopOpacity={0.42} />
          </RadialGradient>
        </Defs>

        <Path d="M0 0 H100 V100 H0 Z" fill={`url(#${skyId})`} />
        <Path d="M0 0 H100 V100 H0 Z" fill={`url(#${glowId})`} />

        {/* Light bloom around the source. */}
        <Ellipse
          cx={def.glow.x * 100}
          cy={def.glow.y * 100}
          rx={16}
          ry={12}
          fill={def.glow.color}
          opacity={0.18}
        />

        <G>
          {motes.map((m, i) => (
            <Circle key={i} cx={m.cx} cy={m.cy} r={m.r} fill={def.moteColor} opacity={m.o} />
          ))}
        </G>

        <Path d={bands[0]} fill={def.bands[0]} opacity={0.85} />
        <Path d={bands[1]} fill={def.bands[1]} opacity={0.9} />
        <Path d={bands[2]} fill={def.bands[2]} />

        <Path d="M0 0 H100 V100 H0 Z" fill={`url(#${vignetteId})`} />
      </Svg>
      {/* Time-of-day tint: over the illustration, under the UI. Every screen
          uses this component, so putting it here is what makes the whole app
          shift with the clock rather than just the home screen. */}
      <AmbientTint />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
