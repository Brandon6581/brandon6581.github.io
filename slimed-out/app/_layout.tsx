import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import 'react-native-reanimated';

import { AdGateProvider } from '@/src/components/AdGateProvider';
import { IAPProvider } from '@/src/components/IAPProvider';
import { OfflineEarningsModal } from '@/src/components/OfflineEarningsModal';
import { StartupGate } from '@/src/startup/StartupGate';
import { useGameLoop } from '@/src/game/useGameLoop';
import { OfflineResult } from '@/src/game/types';

// React Navigation's DarkTheme paints scenes near-black. The illustrated
// backdrop covers that, but matching it here means any transient gap (screen
// transitions, a slow first frame) shows deep moss rather than a black flash.
const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: '#122A22', card: '#101E19' },
};

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [offlineResult, setOfflineResult] = useState<OfflineResult | null>(null);
  // The offline summary waits for the studio card (and first-run onboarding) to
  // clear, so it lands on the dashboard instead of animating in underneath an
  // opaque overlay where the player never sees it.
  const [startupClear, setStartupClear] = useState(false);

  const onOfflineEarnings = useCallback((result: OfflineResult) => {
    setOfflineResult(result);
  }, []);

  const handleStartupClear = useCallback(() => setStartupClear(true), []);

  useGameLoop(onOfflineEarnings, startupClear);

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ThemeProvider value={navTheme}>
      <IAPProvider>
        <AdGateProvider>
          <StartupGate onBrandComplete={handleStartupClear}>
          <Stack>
            {/* title doubles as the back-button label on pushed screens. */}
            <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Back' }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <OfflineEarningsModal result={offlineResult} onClose={() => setOfflineResult(null)} />
          </StartupGate>
        </AdGateProvider>
      </IAPProvider>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
