import { BigShouldersDisplay_600SemiBold, BigShouldersDisplay_800ExtraBold } from '@expo-google-fonts/big-shoulders-display';
import {
  SchibstedGrotesk_400Regular,
  SchibstedGrotesk_500Medium,
  SchibstedGrotesk_600SemiBold,
  SchibstedGrotesk_700Bold,
  SchibstedGrotesk_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/schibsted-grotesk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Slot, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/lib/auth';
import { AppLockProvider } from '@/lib/lock';
import { useTheme } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true } },
});

function Root() {
  const { c, isDark } = useTheme();
  const { loading } = useAuth();
  const [fontsLoaded] = useFonts({
    SchibstedGrotesk_400Regular,
    SchibstedGrotesk_500Medium,
    SchibstedGrotesk_600SemiBold,
    SchibstedGrotesk_700Bold,
    SchibstedGrotesk_800ExtraBold,
    BigShouldersDisplay_600SemiBold,
    BigShouldersDisplay_800ExtraBold,
  });
  const ready = fontsLoaded && !loading;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  const navTheme = isDark ? DarkTheme : DefaultTheme;
  if (!ready) return null;
  return (
    <ThemeProvider value={{ ...navTheme, colors: { ...navTheme.colors, background: c.background, card: c.surface, primary: c.primary } }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppLockProvider>
        <Slot />
      </AppLockProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Root />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
