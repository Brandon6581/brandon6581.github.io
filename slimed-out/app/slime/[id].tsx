import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Backdrop } from '@/src/art/Backdrop';
import { SlimeSprite } from '@/src/art/SlimeSprite';
import { useSlimeEyes } from '@/src/art/useSlimeEyes';
import { resolveBackdrop } from '@/src/game/backgroundData';
import {
  costForNextSlime,
  costForSlimeUpgrade,
  globalMultiplier,
  nextSlimeUpgrade,
  slimeUpgradeMultiplier,
} from '@/src/game/economy';
import { ownedItemIds, ownedSkinIds } from '@/src/game/entitlements';
import { resolveLook } from '@/src/game/skinData';
import { SLIME_BY_ID } from '@/src/game/slimeData';
import { useGameStore } from '@/src/game/store';
import { SLIME_UPGRADE_MILESTONES } from '@/src/game/types';
import { theme } from '@/src/theme';
import { formatGps, formatNumber } from '@/src/utils/format';

/** Full-page character card: portrait art, name, lore, and live stats. */
export default function SlimeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const state = useGameStore();
  const buySlime = useGameStore((s) => s.buySlime);
  const buySlimeUpgrade = useGameStore((s) => s.buySlimeUpgrade);
  const { eyes, rouse } = useSlimeEyes();

  const backdrop = resolveBackdrop(state.selectedBackdropId, ownedItemIds(state));
  const def = id ? SLIME_BY_ID[id] : undefined;

  if (!def) {
    return (
      <Backdrop def={backdrop}>
        <SafeAreaView style={styles.fill}>
          <Stack.Screen options={{ title: 'Unknown slime' }} />
          <View style={styles.missing}>
            <Text style={styles.missingText}>That slime does not exist.</Text>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>Go back</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Backdrop>
    );
  }

  const owned = state.slimes[def.id] ?? { count: 0, upgradeLevels: 0 };
  const unlocked = state.lifetimeGoo >= def.unlockAtLifetimeGoo;
  const perUnit = def.baseGps * slimeUpgradeMultiplier(owned.upgradeLevels);
  const effectivePerUnit = perUnit * globalMultiplier(state);
  const totalFromThis = effectivePerUnit * owned.count;
  const nextCost = costForNextSlime(def, owned.count);
  const upgrade = nextSlimeUpgrade(owned);
  const upgradeCost = upgrade ? costForSlimeUpgrade(def, upgrade.index) : null;

  return (
    <Backdrop def={backdrop}>
      <Stack.Screen options={{ title: def.name, headerTransparent: true, headerTintColor: '#fff' }} />
      <SafeAreaView style={styles.fill} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Portrait. Tapping wakes it up - purely expressive, no game effect. */}
          <View style={styles.portrait}>
            <View pointerEvents="none" style={styles.portraitArt}>
              <SlimeSprite
                look={resolveLook(def.id, def.look, ownedSkinIds(state))}
                eyes={eyes}
                size={220}
                seed={def.id}
              />
            </View>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={rouse}
              accessibilityRole="button"
              accessibilityLabel={`Wake the ${def.name}`}
            />
          </View>

          <Text style={styles.name}>{unlocked ? def.name : '???'}</Text>
          <Text style={styles.tier}>Tier {def.tier}</Text>

          {unlocked ? (
            <>
              <Text style={styles.flavor}>{def.flavor}</Text>

              {def.originNote && (
                <View style={styles.loreCard}>
                  <Text style={styles.loreLabel}>Origin</Text>
                  <Text style={styles.loreText}>{def.originNote}</Text>
                </View>
              )}

              <View style={styles.statGrid}>
                <Stat label="Owned" value={formatNumber(owned.count)} />
                <Stat label="Output each" value={formatGps(effectivePerUnit)} />
                <Stat label="Total output" value={formatGps(totalFromThis)} />
                <Stat
                  label="Upgrades"
                  value={`${owned.upgradeLevels} / ${SLIME_UPGRADE_MILESTONES.length}`}
                />
              </View>

              <Pressable
                style={[styles.action, state.goo < nextCost && styles.actionDisabled]}
                disabled={state.goo < nextCost}
                onPress={() => buySlime(def.id)}
              >
                <Text style={styles.actionText}>Buy one for {formatNumber(nextCost)} goo</Text>
              </Pressable>

              {upgrade && (
                <Pressable
                  style={[
                    styles.actionAlt,
                    (!upgrade.available || state.goo < (upgradeCost ?? Infinity)) &&
                      styles.actionDisabled,
                  ]}
                  disabled={!upgrade.available || state.goo < (upgradeCost ?? Infinity)}
                  onPress={() => buySlimeUpgrade(def.id)}
                >
                  <Text style={styles.actionText}>
                    {upgrade.available
                      ? `Upgrade to 2x output - ${formatNumber(upgradeCost ?? 0)} goo`
                      : `Next upgrade unlocks at ${upgrade.requiredOwned} owned`}
                  </Text>
                </Pressable>
              )}
            </>
          ) : (
            <Text style={styles.locked}>
              Locked. Earn {formatNumber(def.unlockAtLifetimeGoo)} lifetime goo to meet this one.
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </Backdrop>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 90, paddingBottom: 48, alignItems: 'center' },
  portrait: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portraitArt: { alignItems: 'center', justifyContent: 'center' },
  name: {
    color: theme.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    marginTop: 4,
    textAlign: 'center',
  },
  tier: {
    color: theme.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 2,
    marginBottom: 12,
  },
  flavor: {
    color: theme.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 16,
  },
  loreCard: {
    backgroundColor: 'rgba(20,26,22,0.6)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    marginBottom: 18,
    width: '100%',
  },
  loreLabel: {
    color: theme.accentGold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  loreText: { color: theme.textSecondary, fontSize: 13, lineHeight: 19, fontStyle: 'italic' },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
    marginBottom: 18,
  },
  stat: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: 'rgba(20,26,22,0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statLabel: {
    color: theme.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statValue: { color: theme.textPrimary, fontSize: 17, fontWeight: '700', marginTop: 2 },
  action: {
    backgroundColor: theme.accentBlue,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  actionAlt: {
    backgroundColor: theme.accentGold,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    width: '100%',
  },
  actionDisabled: { backgroundColor: 'rgba(90,100,110,0.55)' },
  actionText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  locked: { color: theme.textMuted, fontSize: 14, textAlign: 'center', marginTop: 8 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  missingText: { color: theme.textSecondary, fontSize: 15 },
  backButton: {
    backgroundColor: theme.accentBlue,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 22,
  },
  backButtonText: { color: '#fff', fontWeight: '700' },
});
