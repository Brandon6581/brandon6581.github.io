import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GameScreen } from '@/src/components/GameScreen';
import {
  costForNextSlime,
  costForSlimeUpgrade,
  isSlimeUnlocked,
  nextSlimeUpgrade,
  slimeUpgradeMultiplier,
} from '@/src/game/economy';
import { SLIMES } from '@/src/game/slimeData';
import { useGameStore } from '@/src/game/store';
import { theme } from '@/src/theme';
import { formatGps, formatNumber } from '@/src/utils/format';

export default function SlimesScreen() {
  const state = useGameStore();
  const buySlime = useGameStore((s) => s.buySlime);
  const buySlimeUpgrade = useGameStore((s) => s.buySlimeUpgrade);

  return (
    <GameScreen title="Your Slimes">
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {SLIMES.map((def) => {
          const unlocked = isSlimeUnlocked(def, state);
          const owned = state.slimes[def.id] ?? { count: 0, upgradeLevels: 0 };
          const nextCost = costForNextSlime(def, owned.count);
          const canAfford = state.goo >= nextCost;
          const upgrade = nextSlimeUpgrade(owned);
          const upgradeCost = upgrade ? costForSlimeUpgrade(def, upgrade.index) : null;
          const perUnitGps = def.baseGps * slimeUpgradeMultiplier(owned.upgradeLevels);

          if (!unlocked) {
            return (
              <View key={def.id} style={[styles.card, styles.lockedCard]}>
                <Text style={styles.lockedEmoji}>🔒</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lockedName}>???</Text>
                  <Text style={styles.lockedHint}>
                    Unlocks at {formatNumber(def.unlockAtLifetimeGoo)} lifetime goo
                  </Text>
                </View>
              </View>
            );
          }

          return (
            <View key={def.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.emoji}>{def.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{def.name}</Text>
                  <Text style={styles.flavor}>{def.flavor}</Text>
                  {def.originNote && <Text style={styles.origin}>{def.originNote}</Text>}
                </View>
              </View>

              <View style={styles.statsRow}>
                <Text style={styles.stat}>Owned: {formatNumber(owned.count)}</Text>
                <Text style={styles.stat}>{formatGps(perUnitGps)} each</Text>
              </View>

              <Pressable
                style={[styles.buyButton, !canAfford && styles.buyButtonDisabled]}
                disabled={!canAfford}
                onPress={() => buySlime(def.id)}
              >
                <Text style={styles.buyButtonText}>Buy for {formatNumber(nextCost)} goo</Text>
              </Pressable>

              {upgrade && (
                <Pressable
                  style={[
                    styles.upgradeButton,
                    (!upgrade.available || state.goo < (upgradeCost ?? Infinity)) &&
                      styles.buyButtonDisabled,
                  ]}
                  disabled={!upgrade.available || state.goo < (upgradeCost ?? Infinity)}
                  onPress={() => buySlimeUpgrade(def.id)}
                >
                  <Text style={styles.buyButtonText}>
                    {upgrade.available
                      ? `Upgrade (2x output) for ${formatNumber(upgradeCost ?? 0)} goo`
                      : `Upgrade at ${upgrade.requiredOwned} owned`}
                  </Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </ScrollView>
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  card: {
    backgroundColor: theme.card,
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  lockedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    opacity: 0.6,
  },
  lockedEmoji: { fontSize: 28 },
  lockedName: { color: theme.textSecondary, fontSize: 16, fontWeight: '700' },
  lockedHint: { color: theme.textMuted, fontSize: 12, marginTop: 2 },
  cardHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  emoji: { fontSize: 40 },
  name: { color: theme.textPrimary, fontSize: 17, fontWeight: '700' },
  flavor: { color: theme.textSecondary, fontSize: 12, marginTop: 2 },
  origin: { color: theme.textMuted, fontSize: 11, marginTop: 4, fontStyle: 'italic' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { color: theme.textSecondary, fontSize: 13, fontWeight: '600' },
  buyButton: {
    backgroundColor: theme.accentBlue,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  upgradeButton: {
    backgroundColor: theme.accentGold,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buyButtonDisabled: { backgroundColor: theme.locked },
  buyButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
});
