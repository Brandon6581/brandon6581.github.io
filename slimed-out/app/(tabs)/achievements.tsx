import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { GameScreen } from '@/src/components/GameScreen';
import { useTabContentPadding } from '@/src/components/useTabContentPadding';
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORIES,
  AchievementDef,
} from '@/src/game/achievementData';
import { achievementPerks, describeAchievementPerk, unlockedCount } from '@/src/game/achievements';
import { useGameStore } from '@/src/game/store';
import { theme } from '@/src/theme';
import { formatNumber } from '@/src/utils/format';

export default function AchievementsScreen() {
  const bottomPad = useTabContentPadding();
  const state = useGameStore();
  const markSeen = useGameStore((s) => s.markAchievementsSeen);

  // Opening the list is what clears the badge.
  useEffect(() => {
    markSeen();
  }, [markSeen]);

  const done = unlockedCount(state);
  const perks = achievementPerks(state);
  const hasPerks = perks.production > 1 || perks.tap > 1;

  return (
    <GameScreen title="Achievements">
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summary}>
          <Text style={styles.summaryCount}>
            {done} / {ACHIEVEMENTS.length}
          </Text>
          <Text style={styles.summaryLabel}>unlocked</Text>
          {hasPerks && (
            <Text style={styles.summaryPerk}>
              Earning you +{Math.round((perks.production - 1) * 100)}% production and +
              {Math.round((perks.tap - 1) * 100)}% tap power
            </Text>
          )}
        </View>

        {ACHIEVEMENT_CATEGORIES.map((category) => {
          const items = ACHIEVEMENTS.filter((a) => a.category === category);
          if (items.length === 0) return null;
          return (
            <View key={category} style={styles.group}>
              <Text style={styles.groupTitle}>{category}</Text>
              {items.map((def) => (
                <Row key={def.id} def={def} unlocked={state.unlockedAchievements.includes(def.id)} />
              ))}
            </View>
          );
        })}

        <Text style={styles.footnote}>
          Achievements unlock on their own the moment you meet them — there is nothing to claim.
          They never reset, and the bonuses some carry are permanent and free.
        </Text>
      </ScrollView>
    </GameScreen>
  );
}

function Row({ def, unlocked }: { def: AchievementDef; unlocked: boolean }) {
  const state = useGameStore();
  const have = Math.min(def.progress(state), def.target);
  const pct = def.target > 0 ? Math.max(0, Math.min(1, have / def.target)) : 0;
  const perk = describeAchievementPerk(def);

  return (
    <View
      style={[styles.card, unlocked && styles.cardDone]}
      accessibilityLabel={
        unlocked
          ? `${def.name}, unlocked. ${def.description}${perk ? ` ${perk}` : ''}`
          : `${def.name}, locked. ${def.description} Progress ${formatNumber(have)} of ${formatNumber(def.target)}.`
      }
    >
      <Text style={[styles.emoji, !unlocked && styles.emojiLocked]}>{def.emoji}</Text>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.name, unlocked && styles.nameDone]} numberOfLines={1}>
            {def.name}
          </Text>
          {unlocked && <Text style={styles.tick}>✓</Text>}
        </View>
        <Text style={styles.description}>{def.description}</Text>

        {!unlocked && (
          <>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${pct * 100}%` }]} />
            </View>
            <Text style={styles.progress}>
              {formatNumber(have)} / {formatNumber(def.target)}
            </Text>
          </>
        )}

        {perk && <Text style={[styles.perk, unlocked && styles.perkActive]}>{perk}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 4, gap: 8 },
  summary: {
    alignItems: 'center',
    backgroundColor: 'rgba(18,24,20,0.66)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.accentGold,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  summaryCount: { color: theme.accentGold, fontSize: 28, fontWeight: '900' },
  summaryLabel: {
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryPerk: {
    color: theme.accentGreen,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
  },
  group: { gap: 8, marginTop: 10 },
  groupTitle: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(18,24,20,0.6)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: 12,
  },
  cardDone: {
    borderColor: theme.accentGreen,
    backgroundColor: 'rgba(143,214,148,0.1)',
  },
  emoji: { fontSize: 26 },
  emojiLocked: { opacity: 0.4 },
  body: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: theme.textSecondary, fontSize: 14, fontWeight: '800', flex: 1 },
  nameDone: { color: theme.textPrimary },
  tick: { color: theme.accentGreen, fontSize: 14, fontWeight: '900' },
  description: { color: theme.textMuted, fontSize: 12, lineHeight: 16 },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    marginTop: 2,
  },
  barFill: { height: 6, borderRadius: 3, backgroundColor: theme.accentBlue },
  progress: { color: theme.textMuted, fontSize: 10, fontWeight: '700' },
  perk: { color: theme.textMuted, fontSize: 11, fontWeight: '700', marginTop: 2 },
  perkActive: { color: theme.accentGreen },
  footnote: {
    color: theme.textMuted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
});
