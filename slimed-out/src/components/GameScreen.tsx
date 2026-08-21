import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { computeGps } from '@/src/game/economy';
import { useGameStore } from '@/src/game/store';
import { theme } from '@/src/theme';
import { formatGps, formatNumber } from '@/src/utils/format';

export function GameScreen({ title, children }: { title: string; children: ReactNode }) {
  const goo = useGameStore((s) => s.goo);
  const state = useGameStore();
  const gps = computeGps(state);

  return (
    <LinearGradient colors={[theme.bgTop, theme.bgBottom]} style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.currencyRow}>
            <Text style={styles.goo}>🫙 {formatNumber(goo)}</Text>
            <Text style={styles.gps}>{formatGps(gps)}</Text>
          </View>
        </View>
        {children}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 4,
  },
  title: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  goo: {
    color: theme.textPrimary,
    fontSize: 28,
    fontWeight: '800',
  },
  gps: {
    color: theme.accentGreen,
    fontSize: 14,
    fontWeight: '600',
  },
});
