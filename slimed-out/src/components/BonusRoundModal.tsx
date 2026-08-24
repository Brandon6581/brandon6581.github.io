import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { BONUS_BANDS, BONUS_SWEEP_PERIOD_MS } from '@/src/game/eventData';
import { sweepPosition } from '@/src/game/events';
import { BonusResult } from '@/src/game/store';
import { theme } from '@/src/theme';
import { formatNumber } from '@/src/utils/format';

/**
 * The bonus round: a marker sweeps the bar, the player stops it, and accuracy
 * sets the multiplier.
 *
 * The one subtlety worth preserving: **what is drawn and what is scored come
 * from the same function.** The marker is positioned by interpolating a driving
 * Animated.Value, and the score reads `sweepPosition(elapsed)` off the same
 * clock the animation started from. Reading a native-driver animated value back
 * on the JS side is throttled and would let the visual and the score disagree
 * by a frame or two - which, in a timing game where the tightest band is 3% of
 * the bar, is the difference between Perfect and Nice.
 *
 * Animation and gesture stay on separate nodes here as everywhere else: the
 * marker is inside a `pointerEvents="none"` layer and the STOP button is a
 * plain, untransformed Pressable.
 */

/** How many samples the driving animation interpolates across one sweep. */
const SAMPLES = 60;

export function BonusRoundModal({
  visible,
  onStop,
  onClose,
}: {
  visible: boolean;
  onStop: (position: number) => BonusResult | null;
  onClose: () => void;
}) {
  const drive = useRef(new Animated.Value(0)).current;
  const startedAt = useRef(0);
  const [result, setResult] = useState<BonusResult | null>(null);

  useEffect(() => {
    if (!visible) return;
    setResult(null);
    drive.setValue(0);
    startedAt.current = Date.now();

    const loop = Animated.loop(
      Animated.timing(drive, {
        toValue: 1,
        duration: BONUS_SWEEP_PERIOD_MS,
        easing: (t) => t, // linear: the scoring maths assumes a constant sweep
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [visible, drive]);

  const handleStop = useCallback(() => {
    if (result) return;
    const position = sweepPosition(Date.now() - startedAt.current);
    drive.stopAnimation();
    setResult(onStop(position));
  }, [drive, onStop, result]);

  // One triangle wave built as an interpolation, so the marker traces exactly
  // the path sweepPosition() describes.
  const inputRange = Array.from({ length: SAMPLES + 1 }, (_, i) => i / SAMPLES);
  const outputRange = inputRange.map((t) => `${sweepPosition(t * BONUS_SWEEP_PERIOD_MS) * 100}%`);
  const left = drive.interpolate({ inputRange, outputRange });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Bonus round</Text>
          <Text style={styles.body}>Stop the marker as close to the centre as you can.</Text>

          <View style={styles.barWrap}>
            {/* Scoring bands, widest first so the tight ones paint on top. */}
            {[...BONUS_BANDS].reverse().map((band) =>
              band.maxDistance === Infinity ? null : (
                <View
                  key={band.label}
                  pointerEvents="none"
                  style={[
                    styles.band,
                    {
                      left: `${(0.5 - band.maxDistance) * 100}%`,
                      width: `${band.maxDistance * 200}%`,
                      backgroundColor: bandColor(band.multiplier),
                    },
                  ]}
                />
              )
            )}
            <View pointerEvents="none" style={styles.centreLine} />
            {!result && (
              <Animated.View pointerEvents="none" style={[styles.marker, { left }]} />
            )}
            {result && (
              <View
                pointerEvents="none"
                style={[styles.marker, styles.markerStopped, { left: `${resultLeft(result)}%` }]}
              />
            )}
          </View>

          <View style={styles.legend}>
            {BONUS_BANDS.filter((b) => b.maxDistance !== Infinity).map((b) => (
              <Text key={b.label} style={styles.legendItem}>
                {b.label} ×{b.multiplier}
              </Text>
            ))}
          </View>

          {result ? (
            <View style={styles.resultBox} accessibilityLiveRegion="polite">
              <Text style={styles.resultLabel}>{result.label}</Text>
              <Text style={styles.resultValue}>
                ×{result.multiplier} — +{formatNumber(result.reward)} goo
              </Text>
            </View>
          ) : (
            <Pressable
              style={styles.stop}
              onPress={handleStop}
              accessibilityRole="button"
              accessibilityLabel="Stop the marker"
            >
              <Text style={styles.stopText}>STOP</Text>
            </Pressable>
          )}

          <Pressable
            style={styles.close}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={result ? 'Collect and close' : 'Close the bonus round'}
          >
            <Text style={styles.closeText}>{result ? 'Collect' : 'Not now'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/** Where to park the stopped marker: the inner edge of the band that scored. */
function resultLeft(result: BonusResult): number {
  const band = BONUS_BANDS.find((b) => b.multiplier === result.multiplier);
  if (!band || band.maxDistance === Infinity) return 50;
  return 50 - band.maxDistance * 100 * 0.5;
}

function bandColor(multiplier: number): string {
  if (multiplier >= 5) return 'rgba(245,196,81,0.55)';
  if (multiplier >= 3) return 'rgba(143,214,148,0.42)';
  if (multiplier >= 2) return 'rgba(91,140,255,0.32)';
  return 'rgba(255,255,255,0.12)';
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.accentGold,
    padding: 22,
    gap: 12,
  },
  title: { color: theme.accentGold, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  body: { color: theme.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  barWrap: {
    height: 46,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: theme.cardBorder,
    overflow: 'hidden',
    justifyContent: 'center',
    marginTop: 4,
  },
  band: { position: 'absolute', top: 0, bottom: 0 },
  centreLine: {
    position: 'absolute',
    left: '50%',
    width: 1,
    top: 4,
    bottom: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  marker: {
    position: 'absolute',
    width: 4,
    top: 0,
    bottom: 0,
    marginLeft: -2,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  markerStopped: { backgroundColor: theme.accentGold, width: 5 },
  legend: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
  legendItem: { color: theme.textMuted, fontSize: 10, fontWeight: '700' },
  stop: {
    backgroundColor: theme.accentGold,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  stopText: { color: '#241C05', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  resultBox: {
    backgroundColor: 'rgba(245,196,81,0.14)',
    borderColor: theme.accentGold,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
  },
  resultLabel: { color: theme.accentGold, fontSize: 18, fontWeight: '900' },
  resultValue: { color: theme.textPrimary, fontSize: 14, fontWeight: '700' },
  close: { alignItems: 'center', paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
  closeText: { color: theme.textSecondary, fontSize: 14, fontWeight: '700' },
});
