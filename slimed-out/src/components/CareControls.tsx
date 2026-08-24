import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CARE_ACTIONS, CareActionDef } from '@/src/game/eventData';
import { careBuffActive, careBuffLeftMs, careCooldownLeftMs, careReady } from '@/src/game/events';
import { useGameStore } from '@/src/game/store';
import { theme } from '@/src/theme';
import { formatDuration } from '@/src/utils/format';

/**
 * Feed and pet, side by side under the tap stage.
 *
 * Each button reports one of three states: ready, running (the buff is live and
 * counting down), or resting (on cooldown). The cooldown is longer than the
 * buff on purpose - there is a gap where the slimes are neither buffed nor
 * ready, which is what stops this becoming a permanent multiplier the player
 * simply has to remember to re-press.
 */
export function CareControls({ nowMs }: { nowMs: number }) {
  const careFor = useGameStore((s) => s.careFor);
  const lastFedAt = useGameStore((s) => s.lastFedAt);
  const lastPettedAt = useGameStore((s) => s.lastPettedAt);
  const care = { lastFedAt, lastPettedAt };

  return (
    <View style={styles.row}>
      {CARE_ACTIONS.map((def) => (
        <CareButton
          key={def.id}
          def={def}
          ready={careReady(care, def.id, nowMs)}
          buffed={careBuffActive(care, def.id, nowMs)}
          buffLeft={careBuffLeftMs(care, def.id, nowMs)}
          cooldownLeft={careCooldownLeftMs(care, def.id, nowMs)}
          onPress={() => careFor(def.id)}
        />
      ))}
    </View>
  );
}

function CareButton({
  def,
  ready,
  buffed,
  buffLeft,
  cooldownLeft,
  onPress,
}: {
  def: CareActionDef;
  ready: boolean;
  buffed: boolean;
  buffLeft: number;
  cooldownLeft: number;
  onPress: () => void;
}) {
  const status = buffed
    ? `${formatDuration(buffLeft)} left`
    : ready
      ? def.blurb
      : `${def.restingLabel} · ${formatDuration(cooldownLeft)}`;

  return (
    <Pressable
      style={[styles.button, ready && styles.buttonReady, buffed && styles.buttonBuffed]}
      onPress={onPress}
      disabled={!ready}
      accessibilityRole="button"
      accessibilityState={{ disabled: !ready }}
      accessibilityLabel={
        ready ? `${def.label} your slimes. ${def.blurb}` : `${def.label}. ${status}`
      }
    >
      <Text style={styles.emoji}>{def.emoji}</Text>
      <View style={styles.textCol}>
        <Text style={[styles.label, ready && styles.labelReady]}>{def.label}</Text>
        <Text style={styles.status} numberOfLines={2}>
          {status}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 4 },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    backgroundColor: 'rgba(18,24,20,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  buttonReady: { borderColor: theme.accentGreen },
  buttonBuffed: { borderColor: theme.accentGold, backgroundColor: 'rgba(245,196,81,0.12)' },
  emoji: { fontSize: 20 },
  textCol: { flex: 1 },
  label: { color: theme.textSecondary, fontSize: 13, fontWeight: '800' },
  labelReady: { color: theme.accentGreen },
  status: { color: theme.textMuted, fontSize: 10, lineHeight: 13, marginTop: 1 },
});
