import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { OfflineResult } from '@/src/game/types';
import { formatDuration, formatNumber } from '@/src/utils/format';

export function OfflineEarningsModal({
  result,
  onClose,
}: {
  result: OfflineResult | null;
  onClose: () => void;
}) {
  return (
    <Modal visible={result != null} animationType="fade" transparent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.emoji}>🫙</Text>
          <Text style={styles.title}>Welcome back!</Text>
          {result && (
            <Text style={styles.body}>
              Your slimes kept working while you were away for{' '}
              <Text style={styles.bold}>{formatDuration(result.cappedMs)}</Text> and made{' '}
              <Text style={styles.bold}>{formatNumber(result.gooEarned)} goo</Text>.
            </Text>
          )}
          <Pressable style={styles.button} onPress={onClose} accessibilityRole="button">
            <Text style={styles.buttonText}>Nice!</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1E2233',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  emoji: {
    fontSize: 40,
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  body: {
    color: '#C3C9E6',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  bold: {
    color: '#8FD694',
    fontWeight: '700',
  },
  button: {
    marginTop: 8,
    backgroundColor: '#5B8CFF',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 14,
  },
  buttonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
});
