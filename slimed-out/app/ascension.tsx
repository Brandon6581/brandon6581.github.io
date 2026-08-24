import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Backdrop } from '@/src/art/Backdrop';
import {
  ASCENSION_CONSTANTS,
  ascensionProgress,
  describeEssenceBonus,
  nextAscensionAt,
} from '@/src/game/ascension';
import { resolveBackdrop } from '@/src/game/backgroundData';
import { ownedItemIds } from '@/src/game/entitlements';
import { useGameStore } from '@/src/game/store';
import { sound } from '@/src/audio/soundEngine';
import { haptics } from '@/src/feel/haptics';
import { theme } from '@/src/theme';
import { formatNumber } from '@/src/utils/format';

/** What an ascension keeps and what it takes, spelled out before they commit. */
const KEPT = [
  'Slime Essence and its permanent bonus',
  'Achievements and everything they grant',
  'Collectible looks, purchases and no-ads',
  'Your login streak and daily progress',
  'Which slimes you have unlocked',
];
const LOST = ['Your goo', 'Every slime you have taken in', 'Every tap upgrade you have bought'];

export default function AscensionScreen() {
  const state = useGameStore();
  const triggerAscension = useGameStore((s) => s.triggerAscension);
  const [toast, setToast] = useState<string | null>(null);

  const backdrop = resolveBackdrop(state.selectedBackdropId, ownedItemIds(state));

  const pending = state.calculatePendingEssence();
  const locked = pending <= 0;
  const target = nextAscensionAt(state.lifetimeEssenceEarned);
  const progress = ascensionProgress(state.lifetimeGoo, state.lifetimeEssenceEarned);
  const currentBonus = describeEssenceBonus(state.slimeEssence);
  const afterBonus = describeEssenceBonus(state.slimeEssence + pending);

  /** Shows a native alert, falling back to the toast where Alert is inert. */
  const announce = (title: string, message: string) => {
    setToast(message);
    if (Platform.OS === 'web') return;
    Alert.alert(title, message, [{ text: 'Nice' }]);
  };

  const ascend = () => {
    // The action returns null rather than throwing, so this catch is for the
    // unexpected - a persistence failure mid-write, say. An ascension wipes a
    // run, so a silent crash here would be the worst possible moment for one.
    try {
      const result = triggerAscension();
      if (!result) {
        // The button is disabled when locked, so this is only reachable if the
        // gate closed between render and press.
        announce('Not yet', 'Not enough all-time goo to ascend yet.');
        return;
      }
      haptics.milestone();
      sound.ascend();
      announce(
        'Ascended',
        `+${formatNumber(result.essenceGained)} Slime Essence. You now hold ` +
          `${formatNumber(result.totalEssence)}, for ${describeEssenceBonus(result.totalEssence)} ` +
          `to all production and tap power.`
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown error';
      announce('Ascension failed', `Something went wrong and nothing was changed. ${detail}`);
    }
  };

  const confirm = () => {
    const message =
      `Ascend for ${formatNumber(pending)} Slime Essence?\n\n` +
      `Your production bonus goes from ${currentBonus} to ${afterBonus}, and ` +
      `your goo, slimes and tap upgrades all reset.`;

    // Alert has no web implementation in react-native-web, so the confirmation
    // would silently never fire there and the button would look broken.
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(message)) ascend();
      return;
    }
    Alert.alert('Ascend?', message, [
      { text: 'Not yet', style: 'cancel' },
      { text: 'Ascend', style: 'destructive', onPress: ascend },
    ]);
  };

  return (
    <Backdrop def={backdrop}>
      <Stack.Screen
        options={{
          title: 'Ascension',
          headerTransparent: true,
          headerTintColor: '#fff',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.fill} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {toast && (
            <View style={styles.toast} accessibilityLiveRegion="polite">
              <Text style={styles.toastText}>{toast}</Text>
            </View>
          )}

          <View style={styles.hero}>
            <Text style={styles.essence}>{formatNumber(state.slimeEssence)}</Text>
            <Text style={styles.essenceLabel}>Slime Essence</Text>
            <Text style={styles.bonus}>{currentBonus} to all goo production and tap power</Text>
            {state.ascensionCount > 0 && (
              <Text style={styles.count}>
                Ascended {state.ascensionCount} {state.ascensionCount === 1 ? 'time' : 'times'}
              </Text>
            )}
          </View>

          <Text style={styles.sectionTitle}>The gate</Text>
          <View style={styles.card}>
            {locked ? (
              <>
                <Text style={styles.desc}>
                  Ascending trades this run for permanent Slime Essence. The gate opens once your
                  all-time goo passes {formatNumber(target)}.
                </Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${progress * 100}%` }]} />
                </View>
                <Text style={styles.progress}>
                  {formatNumber(state.lifetimeGoo)} / {formatNumber(target)} all-time goo
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.desc}>
                  Ready. Ascending now banks{' '}
                  <Text style={styles.bold}>{formatNumber(pending)} Slime Essence</Text>, taking your
                  permanent bonus from {currentBonus} to {afterBonus}.
                </Text>
                <Text style={styles.progress}>
                  All-time goo: {formatNumber(state.lifetimeGoo)}
                </Text>
              </>
            )}
          </View>

          {/* The two outcomes get deliberately opposed boundary boxes. This is
              a destructive, irreversible action, so which side of the line a
              value falls on has to be readable at a glance rather than needing
              the labels to be read carefully. */}
          <Text style={[styles.sectionTitle, styles.keepTitle]}>Safe · kept forever</Text>
          <View style={[styles.card, styles.keepCard]}>
            {KEPT.map((line) => (
              <Text key={line} style={styles.keepLine}>
                ✓ {line}
              </Text>
            ))}
          </View>

          <Text style={[styles.sectionTitle, styles.loseTitle]}>Wiped · this run resets</Text>
          <View style={[styles.card, styles.loseCard]}>
            {LOST.map((line) => (
              <Text key={line} style={styles.loseLine}>
                ✕ {line}
              </Text>
            ))}
            <Text style={styles.loseWarning}>
              This cannot be undone. Everything above is gone the moment you ascend.
            </Text>
          </View>

          <Pressable
            style={[styles.ascend, locked && styles.ascendLocked]}
            onPress={confirm}
            disabled={locked}
            accessibilityRole="button"
            accessibilityState={{ disabled: locked }}
            accessibilityLabel={
              locked
                ? `Ascension locked. ${formatNumber(target)} all-time goo needed.`
                : `Ascend for ${formatNumber(pending)} Slime Essence`
            }
          >
            <Text style={[styles.ascendText, locked && styles.ascendTextLocked]}>
              {locked ? 'Locked' : `Ascend for ${formatNumber(pending)} essence`}
            </Text>
          </Pressable>

          <Text style={styles.footnote}>
            Each point of essence adds {ASCENSION_CONSTANTS.PER_ESSENCE_BONUS * 100}% forever.
            Essence is awarded on the growth in your all-time goo since your last ascension, so it
            counts every goo you earn exactly once.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Backdrop>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 96, paddingBottom: 48, gap: 10 },
  hero: {
    alignItems: 'center',
    backgroundColor: 'rgba(18,24,20,0.7)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.accentBlue,
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 2,
  },
  essence: { color: theme.accentBlue, fontSize: 40, fontWeight: '900' },
  essenceLabel: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  bonus: { color: theme.accentGreen, fontSize: 13, fontWeight: '700', marginTop: 6, textAlign: 'center' },
  count: { color: theme.textMuted, fontSize: 12, marginTop: 4 },
  sectionTitle: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 8,
  },
  card: {
    backgroundColor: 'rgba(18,24,20,0.66)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    gap: 8,
  },
  desc: { color: theme.textSecondary, fontSize: 13, lineHeight: 19 },
  bold: { color: theme.accentBlue, fontWeight: '800' },
  progress: { color: theme.textMuted, fontSize: 12, fontWeight: '600' },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  barFill: { height: 8, borderRadius: 4, backgroundColor: theme.accentBlue },
  keepTitle: { color: theme.accentGreen },
  keepCard: {
    borderColor: theme.accentGreen,
    borderWidth: 2,
    backgroundColor: 'rgba(143,214,148,0.10)',
  },
  keepLine: { color: theme.accentGreen, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  loseTitle: { color: theme.danger },
  loseCard: {
    borderColor: theme.danger,
    borderWidth: 2,
    backgroundColor: 'rgba(227,103,103,0.12)',
  },
  loseLine: { color: theme.danger, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  loseWarning: {
    color: theme.danger,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  ascend: {
    backgroundColor: theme.accentBlue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
    marginTop: 12,
  },
  ascendLocked: { backgroundColor: 'rgba(255,255,255,0.08)' },
  ascendText: { color: '#0B1430', fontSize: 16, fontWeight: '900' },
  ascendTextLocked: { color: theme.textMuted },
  toast: {
    backgroundColor: 'rgba(91,140,255,0.16)',
    borderColor: theme.accentBlue,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  toastText: { color: theme.accentBlue, fontWeight: '800', fontSize: 13, textAlign: 'center' },
  footnote: {
    color: theme.textMuted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});
