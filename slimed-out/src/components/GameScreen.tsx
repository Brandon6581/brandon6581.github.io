import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Backdrop } from '@/src/art/Backdrop';
import { computeGps } from '@/src/game/economy';
import { resolveBackdrop } from '@/src/game/backgroundData';
import { ownedItemIds } from '@/src/game/entitlements';
import { useGameStore } from '@/src/game/store';
import { theme } from '@/src/theme';
import { formatGps, formatNumber } from '@/src/utils/format';

export function GameScreen({ title, children }: { title: string; children: ReactNode }) {
  const goo = useGameStore((s) => s.goo);
  const state = useGameStore();
  const gps = computeGps(state);
  const backdrop = resolveBackdrop(state.selectedBackdropId, ownedItemIds(state));

  return (
    <Backdrop def={backdrop}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.currencyRow}>
            <Text style={styles.goo}>{formatNumber(goo)}</Text>
            <Text style={styles.gooLabel}>goo</Text>
            <Text style={styles.gps}>{formatGps(gps)}</Text>
          </View>
        </View>
        {children}
      </SafeAreaView>
    </Backdrop>
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
    gap: 8,
  },
  goo: {
    color: theme.textPrimary,
    fontSize: 30,
    fontWeight: '800',
  },
  gooLabel: {
    color: theme.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  gps: {
    color: theme.accentGreen,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 'auto',
  },
});
