import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { MAX_NAME_LENGTH } from '@/src/game/store';
import { theme } from '@/src/theme';

interface Props {
  visible: boolean;
  title: string;
  initialValue: string;
  placeholder: string;
  onSave: (value: string) => void;
  onCancel: () => void;
}

export function NameEditor({ visible, title, initialValue, placeholder, onSave, onCancel }: Props) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={theme.textMuted}
            maxLength={MAX_NAME_LENGTH}
            autoFocus
            selectTextOnFocus
            returnKeyType="done"
            onSubmitEditing={() => onSave(value)}
          />
          <Text style={styles.counter}>
            {value.trim().length}/{MAX_NAME_LENGTH}
          </Text>
          <View style={styles.row}>
            <Pressable
              style={[styles.button, styles.cancel]}
              onPress={onCancel}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.save]}
              onPress={() => onSave(value)}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>Save</Text>
            </Pressable>
          </View>
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
    maxWidth: 360,
    backgroundColor: '#1A211A',
    borderRadius: 18,
    padding: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  title: { color: theme.textPrimary, fontSize: 17, fontWeight: '700' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  counter: { color: theme.textMuted, fontSize: 11, textAlign: 'right' },
  row: { flexDirection: 'row', gap: 10, marginTop: 4 },
  button: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  cancel: { backgroundColor: 'rgba(255,255,255,0.1)' },
  save: { backgroundColor: theme.accentGreen },
  buttonText: { color: '#12210F', fontWeight: '800', fontSize: 14 },
});
