import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { SlimeSprite } from '@/src/art/SlimeSprite';
import { SlimeSkinDef } from '@/src/game/skinData';
import { theme } from '@/src/theme';

/** Celebrates stumbling on a rare variant during normal play. */
export function SkinFoundModal({ skin, onClose }: { skin: SlimeSkinDef | null; onClose: () => void }) {
  return (
    <Modal visible={skin !== null} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.kicker}>A rare one turned up</Text>
          {skin && (
            <>
              <View pointerEvents="none" style={styles.art}>
                <SlimeSprite look={skin.look} eyes="roused" size={150} seed={skin.id} />
              </View>
              <Text style={styles.name}>{skin.name}</Text>
              <Text style={styles.blurb}>
                It has joined your collection. Nothing to buy - you found this one.
              </Text>
            </>
          )}
          <Pressable style={styles.button} onPress={onClose} accessibilityRole="button">
            <Text style={styles.buttonText}>Keep it</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1A211A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.accentGold,
    padding: 22,
    alignItems: 'center',
    gap: 8,
  },
  kicker: {
    color: theme.accentGold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  art: { alignItems: 'center', justifyContent: 'center' },
  name: { color: theme.textPrimary, fontSize: 20, fontWeight: '800' },
  blurb: {
    color: theme.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  button: {
    marginTop: 8,
    backgroundColor: theme.accentGold,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 14,
  },
  buttonText: { color: '#241C05', fontWeight: '800', fontSize: 14 },
});
