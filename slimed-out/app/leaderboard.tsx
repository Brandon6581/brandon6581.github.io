import { Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Backdrop } from '@/src/art/Backdrop';
import { NameEditor } from '@/src/components/NameEditor';
import { haptics } from '@/src/feel/haptics';
import { resolveBackdrop } from '@/src/game/backgroundData';
import { ownedItemIds } from '@/src/game/entitlements';
import { gooToNextRank, leaderboardRows, playerRank } from '@/src/game/leaderboard';
import { LEADERBOARD_SIZE } from '@/src/game/leaderboardData';
import { DEFAULT_DISPLAY_NAME, RedeemResult, useGameStore } from '@/src/game/store';
import { theme } from '@/src/theme';
import { formatNumber } from '@/src/utils/format';

export default function LeaderboardScreen() {
  const state = useGameStore();
  const setDisplayName = useGameStore((s) => s.setDisplayName);
  const redeemCode = useGameStore((s) => s.redeemCode);
  const canRenameSelf = useGameStore((s) => s.canRenameSelf);

  const [editing, setEditing] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [redeem, setRedeem] = useState<RedeemResult | null>(null);

  const backdrop = resolveBackdrop(state.selectedBackdropId, ownedItemIds(state));

  const snapshot = {
    name: state.displayName,
    allTimeGoo: state.lifetimeGoo,
    slimeEssence: state.slimeEssence,
  };
  const rows = leaderboardRows(snapshot);
  const rank = playerRank(snapshot);
  const toNext = gooToNextRank(snapshot);
  const onBoard = rank <= LEADERBOARD_SIZE;

  const submitCode = () => {
    const result = redeemCode(codeInput);
    setRedeem(result);
    if (result.ok) {
      haptics.confirm();
      setCodeInput('');
    } else {
      haptics.denied();
    }
  };

  return (
    <Backdrop def={backdrop}>
      <Stack.Screen
        options={{
          title: 'Leaderboard',
          headerTransparent: true,
          headerTintColor: '#fff',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.fill} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.standing}>
            <Text style={styles.standingRank}>#{rank}</Text>
            <Text style={styles.standingLabel}>
              {onBoard ? 'on the board' : `just outside the top ${LEADERBOARD_SIZE}`}
            </Text>
            {toNext > 0 && (
              <Text style={styles.standingNext}>
                {formatNumber(toNext)} more all-time goo to take the next place
              </Text>
            )}
          </View>

          <Text style={styles.sectionTitle}>Top {LEADERBOARD_SIZE}</Text>
          <View style={styles.card}>
            {rows.map((entry, index) => {
              const pinned = entry.isPlayer && entry.rank > LEADERBOARD_SIZE;
              return (
                <View key={entry.id}>
                  {pinned && <View style={styles.gap} />}
                  <View
                    style={[styles.row, entry.isPlayer && styles.rowPlayer]}
                    accessibilityLabel={
                      `Rank ${entry.rank}. ${entry.isPlayer ? 'You' : entry.name}. ` +
                      `${formatNumber(entry.allTimeGoo)} all-time goo, ` +
                      `${formatNumber(entry.slimeEssence)} essence.`
                    }
                  >
                    <Text style={[styles.rank, entry.isPlayer && styles.rankPlayer]}>
                      {entry.rank}
                    </Text>
                    <View style={styles.rowBody}>
                      <Text
                        style={[styles.name, entry.isPlayer && styles.namePlayer]}
                        numberOfLines={1}
                      >
                        {entry.name}
                        {entry.isPlayer ? '  · you' : ''}
                      </Text>
                      <Text style={styles.stats}>
                        {formatNumber(entry.allTimeGoo)} all-time ·{' '}
                        {formatNumber(entry.slimeEssence)} essence
                      </Text>
                    </View>
                  </View>
                  {index === rows.length - 1 || pinned ? null : <View style={styles.divider} />}
                </View>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Your name on the board</Text>
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.currentName}>{state.displayName}</Text>
              <Pressable
                style={[styles.smallButton, !canRenameSelf() && styles.smallButtonOff]}
                onPress={() => setEditing(true)}
                disabled={!canRenameSelf()}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canRenameSelf() }}
                accessibilityLabel="Change your leaderboard name"
              >
                <Text
                  style={[styles.smallButtonText, !canRenameSelf() && styles.smallButtonTextOff]}
                >
                  Change
                </Text>
              </Pressable>
            </View>
            <Text style={styles.hint}>
              {canRenameSelf()
                ? 'This is the name shown on the board. You have a free change available.'
                : 'Further name changes are in the shop, under Identity.'}
            </Text>
          </View>

          {/* Reuses the game's one display name rather than adding a second,
              free-to-change alias. A separate alias field would quietly undercut
              the paid "change display name" item in the shop. */}
          <NameEditor
            visible={editing}
            title="Leaderboard name"
            initialValue={state.displayName}
            placeholder={DEFAULT_DISPLAY_NAME}
            onCancel={() => setEditing(false)}
            onSave={(next) => {
              setDisplayName(next);
              setEditing(false);
            }}
          />

          <Text style={styles.sectionTitle}>Redeem a code</Text>
          <View style={styles.card}>
            <TextInput
              style={styles.input}
              value={codeInput}
              onChangeText={setCodeInput}
              placeholder="Enter a code"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              onSubmitEditing={submitCode}
              returnKeyType="done"
              accessibilityLabel="Redemption code"
            />
            <Pressable
              style={styles.redeem}
              onPress={submitCode}
              accessibilityRole="button"
              accessibilityLabel="Redeem this code"
            >
              <Text style={styles.redeemText}>Redeem</Text>
            </Pressable>

            {redeem && (
              <View
                style={[styles.result, redeem.ok ? styles.resultOk : styles.resultBad]}
                accessibilityLiveRegion="polite"
              >
                <Text style={[styles.resultText, redeem.ok ? styles.okText : styles.badText]}>
                  {redeem.message}
                </Text>
              </View>
            )}

            <Text style={styles.hint}>
              Codes work offline and each one can be used once on this device.
              {state.redeemedCodes.length > 0
                ? ` You have used ${state.redeemedCodes.length} so far.`
                : ''}
            </Text>
          </View>

          <Text style={styles.footnote}>
            Everything here stays on your device. There are no accounts, no servers, and nothing is
            uploaded — the board is you against ten locals.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Backdrop>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 96, paddingBottom: 48, gap: 10 },
  standing: {
    alignItems: 'center',
    backgroundColor: 'rgba(18,24,20,0.7)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.accentGold,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  standingRank: { color: theme.accentGold, fontSize: 38, fontWeight: '900' },
  standingLabel: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  standingNext: { color: theme.textMuted, fontSize: 12, marginTop: 6, textAlign: 'center' },
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  rowPlayer: {
    backgroundColor: 'rgba(143,214,148,0.14)',
    borderRadius: 10,
    paddingHorizontal: 8,
    marginHorizontal: -8,
  },
  rank: { color: theme.textMuted, fontSize: 15, fontWeight: '800', width: 26, textAlign: 'center' },
  rankPlayer: { color: theme.accentGreen },
  rowBody: { flex: 1 },
  name: { color: theme.textSecondary, fontSize: 14, fontWeight: '700' },
  namePlayer: { color: theme.accentGreen },
  stats: { color: theme.textMuted, fontSize: 11, marginTop: 1 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  gap: { height: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  currentName: { color: theme.textPrimary, fontSize: 16, fontWeight: '700', flex: 1 },
  smallButton: {
    backgroundColor: theme.accentGreen,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  smallButtonOff: { backgroundColor: 'rgba(255,255,255,0.08)' },
  smallButtonText: { color: '#0E1B0C', fontWeight: '800', fontSize: 13 },
  smallButtonTextOff: { color: theme.textMuted },
  hint: { color: theme.textMuted, fontSize: 12, lineHeight: 16 },
  input: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: theme.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 46,
    color: theme.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
  redeem: {
    backgroundColor: theme.accentBlue,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    minHeight: 46,
    justifyContent: 'center',
  },
  redeemText: { color: '#0B1430', fontSize: 14, fontWeight: '800' },
  result: { borderRadius: 12, borderWidth: 1, padding: 10 },
  resultOk: { backgroundColor: 'rgba(143,214,148,0.14)', borderColor: theme.accentGreen },
  resultBad: { backgroundColor: 'rgba(227,103,103,0.14)', borderColor: theme.danger },
  resultText: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  okText: { color: theme.accentGreen },
  badText: { color: theme.danger },
  footnote: {
    color: theme.textMuted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});
