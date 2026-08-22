import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { GameScreen } from '@/src/components/GameScreen';
import { useTabContentPadding } from '@/src/components/useTabContentPadding';
import { useIAP } from '@/src/components/IAPProvider';
import { NameEditor } from '@/src/components/NameEditor';
import { DevPanel } from '@/src/dev/DevPanel';
import { BACKDROPS, isBackdropUnlocked } from '@/src/game/backgroundData';
import { adsRemoved, ownedItemIds, ownsItem } from '@/src/game/entitlements';
import { DEFAULT_DISPLAY_NAME, DEFAULT_FARM_NAME, useGameStore } from '@/src/game/store';
import { theme } from '@/src/theme';

export default function SettingsScreen() {
  const bottomPad = useTabContentPadding();
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const toggleSound = useGameStore((s) => s.toggleSound);
  const resetProgress = useGameStore((s) => s.resetProgress);
  const state = useGameStore();
  const noAdsPurchased = adsRemoved(state);
  const selectedBackdropId = useGameStore((s) => s.selectedBackdropId);
  const setBackdrop = useGameStore((s) => s.setBackdrop);
  const farmName = useGameStore((s) => s.farmName);
  const displayName = useGameStore((s) => s.displayName);
  const setFarmName = useGameStore((s) => s.setFarmName);
  const setDisplayName = useGameStore((s) => s.setDisplayName);
  const { restore } = useIAP();
  const [restoring, setRestoring] = useState(false);
  const [editing, setEditing] = useState<'farm' | 'display' | null>(null);

  const hasFoundersBadge = ownsItem(state, 'founders_badge');
  const canNameFarm = ownsItem(state, 'name_your_farm');
  const canNameSelf = ownsItem(state, 'custom_username');

  const handleRestore = async () => {
    setRestoring(true);
    const count = await restore();
    setRestoring(false);
    Alert.alert(
      'Restore Purchases',
      count > 0 ? `Restored ${count} purchase(s).` : 'No previous purchases found on this device.'
    );
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Progress',
      'This will erase your goo, slimes, and free upgrades. Purchased add-ons stay unlocked once restored. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: resetProgress },
      ]
    );
  };

  return (
    <GameScreen title="Settings">
      <ScrollView contentContainerStyle={[styles.list, { paddingBottom: bottomPad }]} showsVerticalScrollIndicator={false}>
        {hasFoundersBadge && (
          <View style={styles.badgeCard}>
            <Text style={styles.badgeText}>Founder - thanks for supporting Slimed Out!</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Your farm</Text>
        <IdentityRow
          label="Farm name"
          value={farmName}
          unlocked={canNameFarm}
          onPress={() => setEditing('farm')}
        />
        <IdentityRow
          label="Display name"
          value={displayName}
          unlocked={canNameSelf}
          onPress={() => setEditing('display')}
        />

        <Text style={styles.sectionTitle}>Backdrop</Text>
        <View style={styles.backdropGrid}>
          {BACKDROPS.map((b) => {
            const unlocked = isBackdropUnlocked(b, ownedItemIds(state));
            const selected = b.id === selectedBackdropId;
            return (
              <Pressable
                key={b.id}
                style={[
                  styles.backdropCard,
                  selected && styles.backdropCardSelected,
                  !unlocked && styles.backdropCardLocked,
                ]}
                disabled={!unlocked}
                onPress={() => setBackdrop(b.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${b.name} backdrop`}
              >
                <View style={styles.swatchRow}>
                  <View style={[styles.swatch, { backgroundColor: b.sky[0] }]} />
                  <View style={[styles.swatch, { backgroundColor: b.sky[1] }]} />
                  <View style={[styles.swatch, { backgroundColor: b.glow.color }]} />
                </View>
                <Text style={styles.backdropName}>{b.name}</Text>
                <Text style={styles.backdropBlurb} numberOfLines={2}>
                  {b.blurb}
                </Text>
                <Text style={[styles.backdropState, selected && styles.backdropStateOn]}>
                  {selected ? 'Selected' : unlocked ? 'Free' : 'In the shop'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Sound effects</Text>
            <Switch value={soundEnabled} onValueChange={toggleSound} />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Ads</Text>
            <Text style={styles.value}>{noAdsPurchased ? 'Removed' : 'Enabled'}</Text>
          </View>
        </View>

        <Pressable
          style={styles.actionButton}
          disabled={restoring}
          onPress={handleRestore}
          accessibilityRole="button"
        >
          <Text style={styles.actionButtonText}>
            {restoring ? 'Restoring…' : 'Restore Purchases'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.actionButton, styles.dangerButton]}
          onPress={handleReset}
          accessibilityRole="button"
        >
          <Text style={styles.actionButtonText}>Reset Progress</Text>
        </Pressable>

        {/* Renders nothing at all in a release build - see src/dev/devMode.ts. */}
        <DevPanel />
      </ScrollView>

      <NameEditor
        visible={editing !== null}
        title={editing === 'farm' ? 'Name your farm' : 'Choose your display name'}
        initialValue={editing === 'farm' ? farmName : displayName}
        placeholder={editing === 'farm' ? DEFAULT_FARM_NAME : DEFAULT_DISPLAY_NAME}
        onCancel={() => setEditing(null)}
        onSave={(value) => {
          if (editing === 'farm') setFarmName(value);
          else if (editing === 'display') setDisplayName(value);
          setEditing(null);
        }}
      />
    </GameScreen>
  );
}

/** A name row that turns into an editable control once its item is owned. */
function IdentityRow({
  label,
  value,
  unlocked,
  onPress,
}: {
  label: string;
  value: string;
  unlocked: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.card} disabled={!unlocked} onPress={onPress}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1 }}>
          <Text style={styles.identityLabel}>{label}</Text>
          <Text style={styles.identityValue} numberOfLines={1}>
            {value}
          </Text>
        </View>
        <Text style={unlocked ? styles.identityAction : styles.identityLocked}>
          {unlocked ? 'Edit' : 'In the shop'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  badgeCard: {
    backgroundColor: 'rgba(245,196,81,0.15)',
    borderRadius: 14,
    padding: 12,
  },
  badgeText: { color: theme.accentGold, fontWeight: '700', fontSize: 13, textAlign: 'center' },
  sectionTitle: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  backdropGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  backdropCard: {
    minHeight: 44,
    justifyContent: 'center',
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: 'rgba(18,24,20,0.62)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 12,
    gap: 4,
  },
  backdropCardSelected: { borderColor: theme.accentGreen, borderWidth: 2 },
  backdropCardLocked: { opacity: 0.5 },
  swatchRow: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  swatch: { width: 18, height: 18, borderRadius: 5 },
  backdropName: { color: theme.textPrimary, fontSize: 14, fontWeight: '700' },
  backdropBlurb: { color: theme.textMuted, fontSize: 11, lineHeight: 15 },
  backdropState: {
    color: theme.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  backdropStateOn: { color: theme.accentGreen },
  card: {
    backgroundColor: 'rgba(18,24,20,0.62)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  identityLabel: {
    color: theme.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  identityValue: { color: theme.textPrimary, fontSize: 16, fontWeight: '700', marginTop: 2 },
  identityAction: { color: theme.accentGreen, fontSize: 13, fontWeight: '700' },
  identityLocked: { color: theme.textMuted, fontSize: 12, fontWeight: '600' },
  label: { color: theme.textPrimary, fontSize: 15, fontWeight: '600' },
  value: { color: theme.textSecondary, fontSize: 14, fontWeight: '600' },
  actionButton: {
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: theme.accentBlue,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dangerButton: { backgroundColor: theme.danger },
  actionButtonText: { color: 'white', fontWeight: '700', fontSize: 14 },
});
