import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAdGate } from '@/src/components/AdGateProvider';
import { GameScreen } from '@/src/components/GameScreen';
import { SLIMES } from '@/src/game/slimeData';
import { useGameStore } from '@/src/game/store';
import { theme } from '@/src/theme';
import { formatNumber } from '@/src/utils/format';

interface Floater {
  id: number;
  value: number;
  anim: Animated.Value;
}

let floaterId = 0;

export default function HomeScreen() {
  const tap = useGameStore((s) => s.tap);
  const totalTaps = useGameStore((s) => s.totalTaps);
  const slimes = useGameStore((s) => s.slimes);
  const { maybeShowAd } = useAdGate();
  const scale = useRef(new Animated.Value(1)).current;
  const [floaters, setFloaters] = useState<Floater[]>([]);

  useFocusEffect(
    useCallback(() => {
      maybeShowAd();
      const interval = setInterval(maybeShowAd, 60_000);
      return () => clearInterval(interval);
    }, [maybeShowAd])
  );

  const handleTap = () => {
    const value = tap();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.sequence([
      Animated.timing(scale, { toValue: 0.92, duration: 60, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 4 }),
    ]).start();

    const anim = new Animated.Value(0);
    const id = floaterId++;
    setFloaters((f) => [...f, { id, value, anim }]);
    Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }).start(() => {
      setFloaters((f) => f.filter((x) => x.id !== id));
    });
  };

  const ownedSummary = SLIMES.filter((s) => (slimes[s.id]?.count ?? 0) > 0);

  return (
    <GameScreen title="Slimed Out!">
      <View style={styles.tapArea}>
        {floaters.map((f) => (
          <Animated.Text
            key={f.id}
            style={[
              styles.floater,
              {
                opacity: f.anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                transform: [
                  {
                    translateY: f.anim.interpolate({ inputRange: [0, 1], outputRange: [0, -70] }),
                  },
                ],
              },
            ]}
          >
            +{formatNumber(f.value)}
          </Animated.Text>
        ))}
        <Pressable onPress={handleTap} hitSlop={20}>
          <Animated.View style={[styles.blob, { transform: [{ scale }] }]}>
            <Text style={styles.blobEmoji}>🟢</Text>
          </Animated.View>
        </Pressable>
        <Text style={styles.hint}>Tap the slime to make goo</Text>
        <Text style={styles.tapCount}>{formatNumber(totalTaps)} taps total</Text>
      </View>

      <ScrollView contentContainerStyle={styles.summary} showsVerticalScrollIndicator={false}>
        <Text style={styles.summaryTitle}>Your collection</Text>
        {ownedSummary.length === 0 ? (
          <Text style={styles.empty}>No slimes yet - visit the Slimes tab once you have some goo!</Text>
        ) : (
          ownedSummary.map((def) => {
            const owned = slimes[def.id];
            return (
              <View key={def.id} style={styles.row}>
                <Text style={styles.rowEmoji}>{def.emoji}</Text>
                <Text style={styles.rowName}>{def.name}</Text>
                <Text style={styles.rowCount}>x{formatNumber(owned.count)}</Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  tapArea: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  blob: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: theme.card,
    borderWidth: 3,
    borderColor: theme.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blobEmoji: {
    fontSize: 96,
  },
  floater: {
    position: 'absolute',
    top: 20,
    color: theme.accentGreen,
    fontSize: 22,
    fontWeight: '800',
  },
  hint: {
    marginTop: 16,
    color: theme.textSecondary,
    fontSize: 13,
  },
  tapCount: {
    marginTop: 4,
    color: theme.textMuted,
    fontSize: 12,
  },
  summary: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 8,
  },
  summaryTitle: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  empty: {
    color: theme.textMuted,
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
  },
  rowEmoji: { fontSize: 22 },
  rowName: { flex: 1, color: theme.textPrimary, fontSize: 14, fontWeight: '600' },
  rowCount: { color: theme.accentGreen, fontSize: 14, fontWeight: '700' },
});
