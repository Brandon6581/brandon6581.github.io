import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

const MIN_WAIT_SECONDS = 5;

export function AdModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [secondsLeft, setSecondsLeft] = useState(MIN_WAIT_SECONDS);

  useEffect(() => {
    if (!visible) {
      setSecondsLeft(MIN_WAIT_SECONDS);
      return;
    }
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [visible]);

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.badge}>SIMULATED AD BREAK</Text>
          <Text style={styles.title}>🎬 Thanks for playing Slimed Out!</Text>
          <Text style={styles.body}>
            This is a stand-in for a real interstitial ad. Wire up an ad network in
            src/services/adService.ts to replace it before release.
          </Text>
          <Pressable
            style={[styles.button, secondsLeft> 0 && styles.buttonDisabled]}
            disabled={secondsLeft > 0}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>
              {secondsLeft > 0 ? `Continue in ${secondsLeft}s` : 'Continue'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#1E2233',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    color: '#9AA3C7',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    color: '#C3C9E6',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  button: {
    marginTop: 8,
    backgroundColor: '#5B8CFF',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  buttonDisabled: {
    backgroundColor: '#3A4066',
  },
  buttonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
});
