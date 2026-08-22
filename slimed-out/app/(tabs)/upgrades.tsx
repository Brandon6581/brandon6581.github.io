import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GameScreen } from '@/src/components/GameScreen';
import { useTabContentPadding } from '@/src/components/useTabContentPadding';
import { globalMilestoneMultiplier, totalSlimesOwned } from '@/src/game/economy';
import { useGameStore } from '@/src/game/store';
import { TAP_UPGRADES } from '@/src/game/upgradeData';
import { theme } from '@/src/theme';
import { formatNumber } from '@/src/utils/format';

export default function UpgradesScreen() {
  const bottomPad = useTabContentPadding();
  const state = useGameStore();
  const buyTapUpgrade = useGameStore((s) => s.buyTapUpgrade);

  const owned = totalSlimesOwned(state);
  const nextMilestone = (Math.floor(owned / 25) + 1) * 25;
  const milestoneMult = globalMilestoneMultiplier(state);

  return (
    <GameScreen title="Upgrades">
      <ScrollView contentContainerStyle={[styles.list, { paddingBottom: bottomPad }]} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLine}>Tap power: +{formatNumber(state.tapPower)} goo/tap</Text>
          <Text style={styles.summaryLine}>
            Collection bonus: +{Math.round((milestoneMult - 1) * 100)}% global production
          </Text>
          <Text style={styles.summarySub}>
            {formatNumber(owned)} slimes owned - next +10% bonus at {formatNumber(nextMilestone)}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Tap upgrades</Text>
        {TAP_UPGRADES.map((u) => {
          const purchased = state.purchasedTapUpgrades.includes(u.id);
          const unlocked = state.lifetimeGoo >= u.unlockAtLifetimeGoo;
          const canAfford = state.goo >= u.cost;

          if (!unlocked && !purchased) {
            return (
              <View key={u.id} style={[styles.card, styles.lockedCard]}>
                <Text style={styles.lockedEmoji}>🔒</Text>
                <Text style={styles.lockedHint}>
                  Unlocks at {formatNumber(u.unlockAtLifetimeGoo)} lifetime goo
                </Text>
              </View>
            );
          }

          return (
            <View key={u.id} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.emoji}>{u.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{u.name}</Text>
                  <Text style={styles.desc}>{u.description}</Text>
                </View>
              </View>
              {purchased ? (
                <View style={styles.ownedBadge}>
                  <Text style={styles.ownedBadgeText}>Owned</Text>
                </View>
              ) : (
                <Pressable
                  style={[styles.buyButton, !canAfford && styles.buyButtonDisabled]}
                  disabled={!canAfford}
                  onPress={() => buyTapUpgrade(u.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Buy ${u.name} for ${formatNumber(u.cost)} goo`}
                >
                  <Text style={styles.buyButtonText}>Buy for {formatNumber(u.cost)} goo</Text>
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
  summaryCard: {
    backgroundColor: theme.cardAlt,
    borderRadius: 16,
    padding: 16,
    gap: 4,
    marginBottom: 4,
  },
  summaryLine: { color: theme.textPrimary, fontSize: 14, fontWeight: '700' },
  summarySub: { color: theme.textMuted, fontSize: 12, marginTop: 4 },
  sectionTitle: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  lockedCard: { flexDirection: 'row', alignItems: 'center', gap: 10, opacity: 0.6 },
  lockedEmoji: { fontSize: 22 },
  lockedHint: { color: theme.textMuted, fontSize: 12, flex: 1 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  emoji: { fontSize: 28 },
  name: { color: theme.textPrimary, fontSize: 15, fontWeight: '700' },
  desc: { color: theme.textSecondary, fontSize: 12, marginTop: 2 },
  buyButton: {
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: theme.accentBlue,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buyButtonDisabled: { backgroundColor: theme.locked },
  buyButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  ownedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(143,214,148,0.15)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  ownedBadgeText: { color: theme.accentGreen, fontWeight: '700', fontSize: 12 },
});
