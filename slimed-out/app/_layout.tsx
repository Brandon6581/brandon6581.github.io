import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import 'react-native-reanimated';

import { AdGateProvider } from '@/src/components/AdGateProvider';
import { IAPProvider } from '@/src/components/IAPProvider';
import { OfflineEarningsModal } from '@/src/components/OfflineEarningsModal';
import { useGameLoop } from '@/src/game/useGameLoop';
import { OfflineResult } from '@/src/game/types';

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [offlineResult, setOfflineResult] = useState<OfflineResult | null>(null);

  const onOfflineEarnings = useCallback((result: OfflineResult) => {
    setOfflineResult(result);
  }, []);

  useGameLoop(onOfflineEarnings);

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ThemeProvider value={DarkTheme}>
      <IAPProvider>
        <AdGateProvider>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <OfflineEarningsModal result={offlineResult} onClose={() => setOfflineResult(null)} />
        </AdGateProvider>
      </IAPProvider>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
