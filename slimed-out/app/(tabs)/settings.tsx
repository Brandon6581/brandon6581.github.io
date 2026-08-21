import Constants from 'expo-constants';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { useIAP } from '@/src/components/IAPProvider';
import { GameScreen } from '@/src/components/GameScreen';
import { useGameStore } from '@/src/game/store';
import { theme } from '@/src/theme';

export default function SettingsScreen() {
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const toggleSound = useGameStore((s) => s.toggleSound);
  const resetProgress = useGameStore((s) => s.resetProgress);
  const noAdsPurchased = useGameStore((s) => s.noAdsPurchased);
  const purchasedAddOns = useGameStore((s) => s.purchasedAddOns);
  const { restore } = useIAP();
  const [restoring, setRestoring] = useState(false);

  const hasFoundersBadge = purchasedAddOns.includes('founders_badge');

  const handleRestore = async () => {
    setRestoring(true);
    const count = await restore();
    setRestoring(false);
    Alert.alert(
      'Restore Purchases',
      count > 0
        ? `Restored ${count} purchase(s).`
        : 'No previous purchases found on this device.'
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
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {hasFoundersBadge && (
          <View style={styles.badgeCard}>
            <Text style={styles.badgeText}>🎖️ Founder - thanks for supporting Slimed Out!</Text>
          </View>
        )}

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

        <Pressable style={styles.actionButton} disabled={restoring} onPress={handleRestore}>
          <Text style={styles.actionButtonText}>
            {restoring ? 'Restoring…' : 'Restore Purchases'}
          </Text>
        </Pressable>

        <Pressable style={[styles.actionButton, styles.dangerButton]} onPress={handleReset}>
          <Text style={styles.actionButtonText}>Reset Progress</Text>
        </Pressable>

        <View style={styles.card}>
          <Text style={styles.aboutTitle}>About</Text>
          <Text style={styles.aboutBody}>
            Slimed Out! v{Constants.expoConfig?.version ?? '1.0.0'}
            {'\n\n'}
            A few slimes in the collection take gentle inspiration from European folklore -
            golems, selkies, banshees, will-o&apos;-the-wisps, and trolls - written as respectful
            nods to those stories rather than caricatures of any culture.
          </Text>
        </View>
      </ScrollView>
    </GameScreen>
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
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: theme.textPrimary, fontSize: 15, fontWeight: '600' },
  value: { color: theme.textSecondary, fontSize: 14, fontWeight: '600' },
  actionButton: {
    backgroundColor: theme.accentBlue,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dangerButton: { backgroundColor: theme.danger },
  actionButtonText: { color: 'white', fontWeight: '700', fontSize: 14 },
  aboutTitle: { color: theme.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 8 },
  aboutBody: { color: theme.textSecondary, fontSize: 13, lineHeight: 19 },
});
