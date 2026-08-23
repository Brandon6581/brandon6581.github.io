import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Backdrop } from '@/src/art/Backdrop';
import { resolveBackdrop } from '@/src/game/backgroundData';
import {
  challengeForWeek,
  dayKey,
  questComplete,
  questReward,
  questTarget,
  questsForDay,
  streakReward,
} from '@/src/game/daily';
import { STREAK_REWARD_SECONDS } from '@/src/game/dailyData';
import { ownedItemIds } from '@/src/game/entitlements';
import { useGameStore } from '@/src/game/store';
import { theme } from '@/src/theme';
import { formatNumber } from '@/src/utils/format';

export default function DailyScreen() {
  const state = useGameStore();
  const claimStreak = useGameStore((s) => s.claimStreak);
  const claimQuest = useGameStore((s) => s.claimQuest);
  const claimWeekly = useGameStore((s) => s.claimWeekly);
  const refreshPeriods = useGameStore((s) => s.refreshPeriods);
  const [toast, setToast] = useState<string | null>(null);

  // The period may have rolled while the app sat in the background.
  useEffect(() => {
    refreshPeriods();
  }, [refreshPeriods]);

  const backdrop = resolveBackdrop(state.selectedBackdropId, ownedItemIds(state));
  const today = dayKey();
  const streakClaimed = state.lastStreakClaimDay === today;
  const quests = questsForDay(state.dailyKey);
  const weekly = challengeForWeek(state.weeklyKey);

  const announce = (label: string, amount: number | null) => {
    setToast(amount == null ? null : `${label}: +${formatNumber(amount)} goo`);
  };

  // What claiming today would give: the run continues if yesterday was claimed.
  const pendingStreakDay = streakClaimed ? state.streakDays : state.streakDays + 1;

  return (
    <Backdrop def={backdrop}>
      <Stack.Screen
        options={{
          title: 'Daily',
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

          {/* ---- Streak ---- */}
          <Text style={styles.sectionTitle}>Login streak</Text>
          <View style={styles.card}>
            <Text style={styles.streakBig}>
              {state.streakDays} {state.streakDays === 1 ? 'day' : 'days'}
            </Text>
            <Text style={styles.desc}>
              {streakClaimed
                ? 'Claimed today. Come back tomorrow to keep the run going.'
                : 'Claim today to keep your run going. Miss a day and it starts over.'}
            </Text>

            <View style={styles.pipRow}>
              {STREAK_REWARD_SECONDS.map((_, i) => {
                const day = i + 1;
                const reached = pendingStreakDay >= day && (streakClaimed || day < pendingStreakDay);
                const isNext = !streakClaimed && day === pendingStreakDay;
                return (
                  <View
                    key={day}
                    style={[styles.pip, reached && styles.pipDone, isNext && styles.pipNext]}
                  >
                    <Text style={[styles.pipText, (reached || isNext) && styles.pipTextOn]}>
                      {day}
                    </Text>
                  </View>
                );
              })}
            </View>

            {streakClaimed ? (
              <ClaimedBadge />
            ) : (
              <ClaimButton
                label={`Claim +${formatNumber(streakReward(pendingStreakDay, state))} goo`}
                onPress={() => announce('Streak', claimStreak())}
              />
            )}
          </View>

          {/* ---- Daily quests ---- */}
          <Text style={styles.sectionTitle}>Today&apos;s quests</Text>
          {quests.map((def) => {
            const target = questTarget(def, state);
            const have = state.dailyCounters[def.metric];
            const done = questComplete(def, state.dailyCounters, state);
            const claimed = state.claimedQuestIds.includes(def.id);
            const pct = Math.max(0, Math.min(1, target > 0 ? have / target : 0));

            return (
              <View key={def.id} style={styles.card}>
                <Text style={styles.questLabel}>
                  {def.label.replace('{target}', formatNumber(target))}
                </Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${pct * 100}%` }]} />
                </View>
                <Text style={styles.progress}>
                  {formatNumber(Math.min(have, target))} / {formatNumber(target)}
                </Text>

                {claimed ? (
                  <ClaimedBadge />
                ) : (
                  <ClaimButton
                    label={
                      done
                        ? `Claim +${formatNumber(questReward(def, state))} goo`
                        : `Reward: ${formatNumber(questReward(def, state))} goo`
                    }
                    disabled={!done}
                    onPress={() => announce('Quest', claimQuest(def.id))}
                  />
                )}
              </View>
            );
          })}

          {/* ---- Weekly challenge ---- */}
          <Text style={styles.sectionTitle}>This week&apos;s challenge</Text>
          {(() => {
            const target = questTarget(weekly, state);
            const have = state.weeklyCounters[weekly.metric];
            const done = questComplete(weekly, state.weeklyCounters, state);
            const pct = Math.max(0, Math.min(1, target > 0 ? have / target : 0));
            return (
              <View style={[styles.card, styles.weeklyCard]}>
                <Text style={styles.questLabel}>
                  {weekly.label.replace('{target}', formatNumber(target))}
                </Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, styles.barFillGold, { width: `${pct * 100}%` }]} />
                </View>
                <Text style={styles.progress}>
                  {formatNumber(Math.min(have, target))} / {formatNumber(target)}
                </Text>
                {state.weeklyClaimed ? (
                  <ClaimedBadge />
                ) : (
                  <ClaimButton
                    label={
                      done
                        ? `Claim +${formatNumber(questReward(weekly, state))} goo`
                        : `Reward: ${formatNumber(questReward(weekly, state))} goo`
                    }
                    disabled={!done}
                    gold
                    onPress={() => announce('Weekly', claimWeekly())}
                  />
                )}
              </View>
            );
          })()}

          <Text style={styles.footnote}>
            Quests reset each day and the challenge each week. Rewards scale with how much your
            collection already produces.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Backdrop>
  );
}

function ClaimButton({
  label,
  onPress,
  disabled,
  gold,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  gold?: boolean;
}) {
  return (
    <Pressable
      style={[styles.claim, gold && styles.claimGold, disabled && styles.claimDisabled]}
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[styles.claimText, disabled && styles.claimTextDisabled]}>{label}</Text>
    </Pressable>
  );
}

function ClaimedBadge() {
  return (
    <View style={styles.claimedBadge}>
      <Text style={styles.claimedText}>Claimed</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 96, paddingBottom: 48, gap: 12 },
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
    gap: 10,
  },
  weeklyCard: { borderColor: theme.accentGold },
  streakBig: { color: theme.textPrimary, fontSize: 26, fontWeight: '800' },
  desc: { color: theme.textSecondary, fontSize: 13, lineHeight: 18 },
  questLabel: { color: theme.textPrimary, fontSize: 15, fontWeight: '700' },
  progress: { color: theme.textSecondary, fontSize: 12, fontWeight: '600' },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  barFill: { height: 8, borderRadius: 4, backgroundColor: theme.accentGreen },
  barFillGold: { backgroundColor: theme.accentGold },
  pipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  pip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pipDone: { backgroundColor: 'rgba(143,214,148,0.22)', borderColor: theme.accentGreen },
  pipNext: { borderColor: theme.accentGold, borderWidth: 2 },
  pipText: { color: theme.textMuted, fontSize: 12, fontWeight: '700' },
  pipTextOn: { color: theme.textPrimary },
  claim: {
    backgroundColor: theme.accentGreen,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  claimGold: { backgroundColor: theme.accentGold },
  claimDisabled: { backgroundColor: 'rgba(255,255,255,0.08)' },
  claimText: { color: '#0E1B0C', fontSize: 14, fontWeight: '800' },
  claimTextDisabled: { color: theme.textMuted },
  claimedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(143,214,148,0.15)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  claimedText: { color: theme.accentGreen, fontWeight: '700', fontSize: 12 },
  toast: {
    backgroundColor: 'rgba(143,214,148,0.16)',
    borderColor: theme.accentGreen,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  toastText: { color: theme.accentGreen, fontWeight: '800', fontSize: 13, textAlign: 'center' },
  footnote: {
    color: theme.textMuted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});
