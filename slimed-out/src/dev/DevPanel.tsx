import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { SLIME_SKINS } from '@/src/game/skinData';
import { SHOP_ITEMS } from '@/src/game/shopData';
import { useGameStore } from '@/src/game/store';
import { theme } from '@/src/theme';

import { isDevCode } from './devMode';

/**
 * Hidden entry point for developer testing mode, plus the panel it opens.
 *
 * This implementation is selected at build time by the `__DEV__` ternary at the
 * bottom of the file, so in a release bundle it is unreferenced and the
 * minifier drops it entirely - the field cannot be found by a reviewer or a
 * player because it is not there.
 *
 * See src/dev/devMode.ts for the full rationale and the pre-submission check.
 */
function DevPanelImpl() {
  const devModeEnabled = useGameStore((s) => s.devModeEnabled);
  const setDevMode = useGameStore((s) => s.setDevMode);
  const toggleDevMode = useGameStore((s) => s.toggleDevMode);
  const grantDevGoo = useGameStore((s) => s.grantDevGoo);
  const [code, setCode] = useState('');
  const [rejected, setRejected] = useState(false);

  const submit = () => {
    if (isDevCode(code)) {
      // Entering the code again is the documented way to turn it back off.
      toggleDevMode();
      setCode('');
      setRejected(false);
    } else {
      setRejected(true);
    }
  };

  const unlockedItems = SHOP_ITEMS.filter((i) => i.status === 'available').length;

  return (
    <View style={styles.wrap}>
      <View style={styles.codeRow}>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={(t) => {
            setCode(t);
            setRejected(false);
          }}
          placeholder="•••"
          placeholderTextColor="rgba(255,255,255,0.18)"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={submit}
          accessibilityLabel="Support code"
        />
        <Pressable style={styles.enter} onPress={submit}>
          <Text style={styles.enterText}>Enter</Text>
        </Pressable>
      </View>
      {rejected && <Text style={styles.rejected}>Not recognized.</Text>}

      {devModeEnabled && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Developer mode</Text>
          <Text style={styles.panelNote}>
            Never ships. Stripped from release builds at compile time.
          </Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Unlock everything</Text>
            <Switch value={devModeEnabled} onValueChange={setDevMode} />
          </View>

          <Text style={styles.stat}>
            {unlockedItems} shop items · {SLIME_SKINS.length} skins · ads off
          </Text>

          <Pressable style={styles.action} onPress={grantDevGoo}>
            <Text style={styles.actionText}>Add 1B goo</Text>
          </Pressable>

          <Text style={styles.panelNote}>
            Turn off with the switch above, or by entering the code again.
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * The export is chosen at BUILD time, not checked at run time.
 *
 * `__DEV__` inlines to a literal here, so a release build compiles this to
 * `const DevPanel = () => null` and `DevPanelImpl` becomes unreferenced - the
 * minifier then drops the implementation, its JSX, and every string in it.
 *
 * An earlier version imported a `DEV_MODE_AVAILABLE` constant from another
 * module and returned null early. That does NOT work: Metro does not propagate
 * constants across modules, so the check stayed live and the panel's markup and
 * strings shipped in the production bundle. `npm run check:no-dev-mode` caught
 * it. Keep the `__DEV__` test in this file.
 */
export const DevPanel: () => React.ReactElement | null = __DEV__
  ? DevPanelImpl
  : () => null;

const styles = StyleSheet.create({
  wrap: { marginTop: 28, gap: 8 },
  codeRow: { flexDirection: 'row', gap: 8, alignItems: 'center', opacity: 0.35 },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: theme.textSecondary,
    fontSize: 13,
  },
  enter: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  enterText: { color: theme.textMuted, fontSize: 12, fontWeight: '700' },
  rejected: { color: theme.textMuted, fontSize: 11, fontStyle: 'italic' },
  panel: {
    backgroundColor: 'rgba(226,131,122,0.1)',
    borderColor: theme.danger,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  panelTitle: { color: theme.danger, fontSize: 14, fontWeight: '800' },
  panelNote: { color: theme.textMuted, fontSize: 11, lineHeight: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { color: theme.textPrimary, fontSize: 14, fontWeight: '600' },
  stat: { color: theme.textSecondary, fontSize: 12, fontWeight: '600' },
  action: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionText: { color: theme.textPrimary, fontSize: 13, fontWeight: '700' },
});
