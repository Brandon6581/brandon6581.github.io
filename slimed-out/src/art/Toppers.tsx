import { Circle, G, Path } from 'react-native-svg';

import { TopperKind } from './slimeLook';

/**
 * Toppers are drawn *behind* the body so their bases tuck under the dome's
 * top edge and read as growing out of the creature rather than sitting on it.
 * All geometry is in the sprite's 100x100 viewBox; the dome crown is near
 * (50, 20).
 */
export function Topper({ kind, color }: { kind: TopperKind; color: string }) {
  switch (kind) {
    case 'horns':
      return (
        <G>
          <Path d="M36 26 C30 20 26 12 27 5 C32 9 37 16 40 24 Z" fill={color} />
          <Path d="M64 26 C70 20 74 12 73 5 C68 9 63 16 60 24 Z" fill={color} />
        </G>
      );

    case 'fin':
      return (
        <Path
          d="M50 3 C56 9 60 16 61 25 C57 22 53 21 50 21 C47 21 43 22 39 25 C40 16 44 9 50 3 Z"
          fill={color}
        />
      );

    case 'crown':
      return (
        <Path
          d="M31 26 L34 12 L40 21 L45 8 L50 19 L55 8 L60 21 L66 12 L69 26 Z"
          fill={color}
        />
      );

    case 'spikes':
      return (
        <G>
          <Path d="M38 26 L41 9 L45 25 Z" fill={color} />
          <Path d="M47 24 L50 4 L53 24 Z" fill={color} />
          <Path d="M55 25 L59 9 L62 26 Z" fill={color} />
        </G>
      );

    case 'facets':
      return (
        <G>
          <Path d="M40 25 L44 8 L49 23 Z" fill={color} opacity={0.95} />
          <Path d="M50 24 L56 6 L60 22 L54 26 Z" fill={color} opacity={0.75} />
          <Path d="M60 25 L67 14 L67 26 Z" fill={color} opacity={0.9} />
        </G>
      );

    case 'antenna':
      return (
        <G>
          <Path d="M43 25 C40 17 37 12 34 8" stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="round" />
          <Path d="M57 25 C60 17 63 12 66 8" stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="round" />
          <Circle cx={33} cy={6} r={4} fill={color} />
          <Circle cx={67} cy={6} r={4} fill={color} />
        </G>
      );

    case 'petals':
      return (
        <G>
          <Path d="M50 22 C44 22 39 17 39 11 C45 9 50 13 50 22 Z" fill={color} opacity={0.9} />
          <Path d="M50 22 C56 22 61 17 61 11 C55 9 50 13 50 22 Z" fill={color} opacity={0.9} />
          <Path d="M50 21 C46 15 47 8 52 4 C56 9 55 16 50 21 Z" fill={color} />
        </G>
      );

    case 'coral':
      return (
        <G stroke={color} strokeWidth={2.6} fill="none" strokeLinecap="round">
          <Path d="M46 26 C44 18 41 14 37 10" />
          <Path d="M41 15 C38 13 35 13 32 14" />
          <Path d="M54 26 C56 17 59 13 64 9" />
          <Path d="M59 14 C62 12 65 12 68 13" />
          <Path d="M50 25 C50 17 51 12 53 7" />
        </G>
      );

    case 'halo':
      return (
        <G>
          <Path
            d="M32 12 C32 7 40 4 50 4 C60 4 68 7 68 12 C68 17 60 20 50 20 C40 20 32 17 32 12 Z"
            stroke={color}
            strokeWidth={2.6}
            fill="none"
            opacity={0.85}
          />
        </G>
      );

    case 'ears':
      return (
        <G>
          <Path d="M38 25 C31 22 27 15 30 9 C36 10 40 17 41 24 Z" fill={color} />
          <Path d="M62 25 C69 22 73 15 70 9 C64 10 60 17 59 24 Z" fill={color} />
        </G>
      );

    case 'flame':
      return (
        <G>
          <Path
            d="M50 24 C44 19 43 12 47 4 C48 9 51 10 52 8 C56 13 57 19 50 24 Z"
            fill={color}
          />
          <Path d="M50 22 C47 19 47 15 49 11 C50 15 52 17 50 22 Z" fill="#FFF3C4" opacity={0.75} />
        </G>
      );

    case 'none':
    default:
      return null;
  }
}
