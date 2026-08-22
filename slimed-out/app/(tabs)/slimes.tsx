import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SlimeSprite } from '@/src/art/SlimeSprite';
import { GameScreen } from '@/src/components/GameScreen';
import {
  costForNextSlime,
  costForSlimeUpgrade,
  isSlimeUnlocked,
  nextSlimeUpgrade,
  slimeUpgradeMultiplier,
} from '@/src/game/economy';
import { resolveLook } from '@/src/game/skinData';
import { SLIMES } from '@/src/game/slimeData';
import { useGameStore } from '@/src/game/store';
import { theme } from '@/src/theme';
import { formatGps, formatNumber } from '@/src/utils/format';

export default function SlimesScreen() {
  const state = useGameStore();
  const buySlime = useGameStore((s) => s.buySlime);
  const buySlimeUpgrade = useGameStore((s) => s.buySlimeUpgrade);
  const router = useRouter();

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
                <View style={styles.lockedArt}>
                  <Text style={styles.lockedGlyph}>?</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lockedName}>Undiscovered</Text>
                  <Text style={styles.lockedHint}>
                    Appears at {formatNumber(def.unlockAtLifetimeGoo)} lifetime goo
                  </Text>
                </View>
              </View>
            );
          }

          return (
            <View key={def.id} style={styles.card}>
              {/* Header doubles as the link into the full character card. */}
              <Pressable
                style={styles.cardHeader}
                onPress={() => router.push({ pathname: '/slime/[id]', params: { id: def.id } })}
              >
                <View pointerEvents="none">
                  <SlimeSprite
                    look={resolveLook(def.id, def.look, state.ownedSkins)}
                    eyes="asleep"
                    size={68}
                    seed={def.id}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{def.name}</Text>
                  <Text style={styles.flavor} numberOfLines={2}>
                    {def.flavor}
                  </Text>
                  <Text style={styles.viewCard}>View character card ›</Text>
                </View>
              </Pressable>

              <View style={styles.statsRow}>
                <Text style={styles.stat}>Owned {formatNumber(owned.count)}</Text>
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
    backgroundColor: 'rgba(18,24,20,0.62)',
    borderRadius: 18,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  lockedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    opacity: 0.55,
  },
  lockedArt: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedGlyph: { color: theme.textMuted, fontSize: 20, fontWeight: '800' },
  lockedName: { color: theme.textSecondary, fontSize: 15, fontWeight: '700' },
  lockedHint: { color: theme.textMuted, fontSize: 12, marginTop: 2 },
  cardHeader: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  name: { color: theme.textPrimary, fontSize: 17, fontWeight: '700' },
  flavor: { color: theme.textSecondary, fontSize: 12, marginTop: 2 },
  viewCard: { color: theme.accentGreen, fontSize: 12, fontWeight: '700', marginTop: 5 },
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
  buyButtonDisabled: { backgroundColor: 'rgba(90,100,110,0.5)' },
  buyButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
});
