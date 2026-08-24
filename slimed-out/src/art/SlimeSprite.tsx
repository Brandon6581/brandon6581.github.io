import { useId, useMemo } from 'react';
import Svg, {
  ClipPath,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
  Circle,
} from 'react-native-svg';

import { EyeState, SlimeLook, hashUnit } from './slimeLook';
import { Topper } from './Toppers';

/**
 * The shared silhouette: a soft dome whose lower edge sags and drips slightly,
 * so the creature reads as a viscous body at rest rather than a geometric shape.
 */
const BODY_PATH =
  'M12 78 C12 42 28 20 50 20 C72 20 88 42 88 78 ' +
  'C88 84 84 87 78 86.5 C72 86 70 89 63 88.5 ' +
  'C56 88 54 90 47 89.5 C40 89 38 87 31 87.5 C24 88 12 85 12 78 Z';

interface BubbleSpec {
  cx: number;
  cy: number;
  r: number;
  o: number;
}

/** Surface bubbles, nudged per-slime so no two share the exact same pattern. */
function makeBubbles(seed: string): BubbleSpec[] {
  const j = hashUnit(seed);
  const base: BubbleSpec[] = [
    { cx: 30, cy: 62, r: 4.6, o: 0.34 },
    { cx: 41, cy: 76, r: 2.7, o: 0.28 },
    { cx: 63, cy: 68, r: 5.4, o: 0.3 },
    { cx: 72, cy: 52, r: 2.9, o: 0.36 },
    { cx: 25, cy: 46, r: 2.2, o: 0.3 },
    { cx: 55, cy: 82, r: 3.4, o: 0.24 },
    { cx: 78, cy: 74, r: 2.4, o: 0.26 },
    { cx: 47, cy: 40, r: 1.9, o: 0.32 },
    { cx: 35, cy: 84, r: 2.1, o: 0.22 },
  ];
  return base.map((b, i) => {
    const drift = ((j * 97 + i * 31) % 10) / 10 - 0.5;
    return { ...b, cx: b.cx + drift * 4, cy: b.cy + drift * 3, r: b.r * (0.85 + j * 0.3) };
  });
}

/** One eye. `side` mirrors the glint so both eyes catch light from the same place. */
function Eye({ x, state, glow }: { x: number; state: EyeState; glow: string }) {
  const y = 58;

  if (state === 'blink') {
    return (
      <Path
        d={`M${x - 7} ${y} C${x - 3} ${y + 4} ${x + 3} ${y + 4} ${x + 7} ${y}`}
        stroke="#20222E"
        strokeWidth={2.4}
        strokeLinecap="round"
        fill="none"
      />
    );
  }

  if (state === 'asleep') {
    return (
      <Path
        d={`M${x - 7} ${y + 1} C${x - 3} ${y - 4} ${x + 3} ${y - 4} ${x + 7} ${y + 1}`}
        stroke="#20222E"
        strokeWidth={2.4}
        strokeLinecap="round"
        fill="none"
        opacity={0.8}
      />
    );
  }

  // roused - wide, bright, alert
  return (
    <G>
      <Ellipse cx={x} cy={y} rx={11} ry={9} fill={glow} opacity={0.35} />
      <Path
        d={`M${x - 8} ${y} C${x - 6} ${y - 8} ${x + 6} ${y - 8} ${x + 8} ${y}
            C${x + 6} ${y + 7} ${x - 6} ${y + 7} ${x - 8} ${y} Z`}
        fill="#20222E"
      />
      <Circle cx={x - 2.6} cy={y - 2.6} r={2.6} fill="#FFFFFF" opacity={0.95} />
      <Circle cx={x + 3} cy={y + 2} r={1.2} fill="#FFFFFF" opacity={0.55} />
    </G>
  );
}

export interface SlimeSpriteProps {
  look: SlimeLook;
  /** Defaults to `asleep` - the resting state. */
  eyes?: EyeState;
  size?: number;
  /** Stable string (use the slime id) so bubbles don't reshuffle between renders. */
  seed?: string;
}

export function SlimeSprite({ look, eyes = 'asleep', size = 120, seed = 'slime' }: SlimeSpriteProps) {
  const rawId = useId();
  const uid = useMemo(() => rawId.replace(/[^a-zA-Z0-9]/g, ''), [rawId]);
  const bubbles = useMemo(() => makeBubbles(seed), [seed]);

  const bodyId = `body${uid}`;
  const coreId = `core${uid}`;
  const glossId = `gloss${uid}`;
  const clipId = `clip${uid}`;
  const rimId = `rim${uid}`;

  const [topColor, bottomColor] = look.body;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        {/* Two-tone blend across the body - the whole point of the look. */}
        <LinearGradient id={bodyId} x1="22%" y1="2%" x2="78%" y2="98%">
          <Stop offset="0" stopColor={topColor} stopOpacity={0.97} />
          <Stop offset="0.52" stopColor={topColor} stopOpacity={0.88} />
          <Stop offset="1" stopColor={bottomColor} stopOpacity={0.95} />
        </LinearGradient>

        {/* Luminous core, so light appears to pass through the body. */}
        <RadialGradient id={coreId} cx="50%" cy="66%" r="46%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.5} />
          <Stop offset="0.6" stopColor="#FFFFFF" stopOpacity={0.12} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>

        {/* Specular gloss, upper-left. */}
        <RadialGradient id={glossId} cx="36%" cy="27%" r="34%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.8} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>

        {/* Rim light gathering along the bottom edge. */}
        <LinearGradient id={rimId} x1="0%" y1="60%" x2="0%" y2="100%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.4} />
        </LinearGradient>

        <ClipPath id={clipId}>
          <Path d={BODY_PATH} />
        </ClipPath>
      </Defs>

      {/* Contact shadow grounds the creature. */}
      <Ellipse cx={50} cy={89} rx={33} ry={5.2} fill="#000000" opacity={0.22} />

      {/* Topper sits behind the dome so its base tucks under the body. */}
      <Topper kind={look.topper} color={look.accent} />

      {/* Body */}
      <Path d={BODY_PATH} fill={`url(#${bodyId})`} />

      <G clipPath={`url(#${clipId})`}>
        <Path d={BODY_PATH} fill={`url(#${coreId})`} />
        <Path d={BODY_PATH} fill={`url(#${rimId})`} />

        {bubbles.map((b, i) => (
          <G key={i}>
            <Circle cx={b.cx} cy={b.cy} r={b.r} fill="#FFFFFF" opacity={b.o * 0.55} />
            <Circle
              cx={b.cx - b.r * 0.3}
              cy={b.cy - b.r * 0.3}
              r={Math.max(0.6, b.r * 0.32)}
              fill="#FFFFFF"
              opacity={b.o}
            />
          </G>
        ))}

        {/* Gloss last so it reads as sitting on the surface. */}
        <Ellipse cx={36} cy={36} rx={20} ry={15} fill={`url(#${glossId})`} />
      </G>

      {/* Soft outline keeps the silhouette from dissolving into the backdrop. */}
      <Path d={BODY_PATH} fill="none" stroke="#FFFFFF" strokeWidth={0.9} opacity={0.28} />

      {/* Face */}
      <Eye x={38} state={eyes} glow={look.accent} />
      <Eye x={62} state={eyes} glow={look.accent} />

      {eyes === 'roused' ? (
        <Path
          d="M45 69 C47.5 72 52.5 72 55 69"
          stroke="#20222E"
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
          opacity={0.85}
        />
      ) : (
        <Path
          d="M46 69 C48 70.5 52 70.5 54 69"
          stroke="#20222E"
          strokeWidth={1.8}
          strokeLinecap="round"
          fill="none"
          opacity={0.5}
        />
      )}
    </Svg>
  );
}
