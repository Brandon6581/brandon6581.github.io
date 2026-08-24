import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Backdrop } from '@/src/art/Backdrop';
import { SlimeSprite } from '@/src/art/SlimeSprite';
import { BACKDROP_BY_ID, DEFAULT_BACKDROP_ID } from '@/src/game/backgroundData';
import { SLIME_BY_ID } from '@/src/game/slimeData';
import { DEFAULT_DISPLAY_NAME, DEFAULT_FARM_NAME, MAX_NAME_LENGTH } from '@/src/game/store';
import { theme } from '@/src/theme';

type OnboardingStep = 'welcome' | 'names' | 'howto';

/**
 * First-run flow: welcome, free naming, then how to play.
 *
 * Both names here are free. The shop's naming items exist to buy *further*
 * changes later, not the first one.
 */
export function Onboarding({ onFinish }: { onFinish: (farm: string, display: string) => void }) {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [farm, setFarm] = useState('');
  const [display, setDisplay] = useState('');

  const backdrop = BACKDROP_BY_ID[DEFAULT_BACKDROP_ID];

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]}>
      <Backdrop def={backdrop}>
        <SafeAreaView style={styles.fill}>
          <KeyboardAvoidingView
            style={styles.fill}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              contentContainerStyle={styles.scroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {step === 'welcome' && (
                <>
                  <View pointerEvents="none" style={styles.hero}>
                    <SlimeSprite look={SLIME_BY_ID.basic.look} eyes="roused" size={170} seed="basic" />
                  </View>
                  <Text style={styles.title} accessibilityRole="header">
                    Slimed Out!
                  </Text>
                  <Text style={styles.body}>
                    You have one slime and an empty patch of ground. Tap it for goo, use the goo to
                    take in more slimes, and before long the place runs itself.
                  </Text>
                  <Primary label="Get started" onPress={() => setStep('names')} />
                </>
              )}

              {step === 'names' && (
                <>
                  <Text style={styles.title} accessibilityRole="header">
                    Make it yours
                  </Text>
                  <Text style={styles.body}>
                    Name your farm and pick what to be called. Both are free, and you can change
                    each one once more later from Settings.
                  </Text>

                  <Field
                    label="Farm name"
                    value={farm}
                    onChange={setFarm}
                    placeholder={DEFAULT_FARM_NAME}
                  />
                  <Field
                    label="Your name"
                    value={display}
                    onChange={setDisplay}
                    placeholder={DEFAULT_DISPLAY_NAME}
                  />

                  <Text style={styles.hint}>
                    Leave either blank to keep the default.
                  </Text>
                  <Primary label="Continue" onPress={() => setStep('howto')} />
                </>
              )}

              {step === 'howto' && (
                <>
                  <Text style={styles.title} accessibilityRole="header">
                    How to play
                  </Text>

                  <Step n={1} heading="Tap the slime">
                    Every tap makes goo. Tapping stays worth doing as you grow - each tap is worth a
                    slice of what your whole collection produces.
                  </Step>
                  <Step n={2} heading="Take in more slimes">
                    Spend goo on the Slimes tab. Slimes make goo on their own, forever, whether or
                    not you are tapping.
                  </Step>
                  <Step n={3} heading="Upgrade what you have">
                    The Upgrades tab raises your tap power. Owning more of the same slime unlocks
                    upgrades that double its output.
                  </Step>
                  <Step n={4} heading="Come back later">
                    Your slimes keep working while the app is closed, up to 8 hours. You will get a
                    summary when you return.
                  </Step>

                  <Primary
                    label="Start playing"
                    onPress={() => onFinish(farm || DEFAULT_FARM_NAME, display || DEFAULT_DISPLAY_NAME)}
                  />
                </>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Backdrop>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        maxLength={MAX_NAME_LENGTH}
        autoCorrect={false}
        returnKeyType="done"
        accessibilityLabel={label}
      />
    </View>
  );
}

function Step({ n, heading, children }: { n: number; heading: string; children: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{n}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepHeading}>{heading}</Text>
        <Text style={styles.stepBody}>{children}</Text>
      </View>
    </View>
  );
}

function Primary({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.primary} onPress={onPress} accessibilityRole="button">
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { zIndex: 100, elevation: 100, backgroundColor: '#122A22' },
  fill: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 48, gap: 14, flexGrow: 1, justifyContent: 'center' },
  hero: { alignItems: 'center' },
  title: {
    color: theme.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    color: theme.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 4,
  },
  hint: { color: theme.textMuted, fontSize: 12, textAlign: 'center' },
  field: { gap: 6 },
  fieldLabel: {
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: 'rgba(10,16,12,0.55)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: theme.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: theme.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { color: theme.accentGreen, fontSize: 12, fontWeight: '800' },
  stepHeading: { color: theme.textPrimary, fontSize: 15, fontWeight: '700' },
  stepBody: { color: theme.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 2 },
  primary: {
    marginTop: 10,
    backgroundColor: theme.accentGreen,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  primaryText: { color: '#0E1B0C', fontSize: 16, fontWeight: '800' },
});
