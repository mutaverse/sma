import { useEffect } from 'react';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import { DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { BackupEffect } from '@/components/backup/BackupEffect';
import { ShopGate } from '@/components/ShopGate';
import { colors } from '@/constants/colors';
import { DATABASE_NAME, wrapExpoDatabase } from '@/db/database';
import { migrate } from '@/db/migrate';
import { fonts } from '@/constants/typography';
import { startNetworkMonitor } from '@/lib/network';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

async function setupDatabase(db: SQLiteDatabase) {
  await migrate(wrapExpoDatabase(db));
}

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
    notification: colors.error,
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    let remove = () => {};
    startNetworkMonitor().then((stop) => {
      remove = stop;
    });
    return () => remove();
  }, []);

  if (!loaded && !error) {
    return null;
  }

  return (
    <ThemeProvider value={navigationTheme}>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={setupDatabase}>
        <ShopGate>
          <BackupEffect />
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShadowVisible: false,
              headerTintColor: colors.primary,
              headerTitleStyle: {
                fontFamily: fonts.semibold,
                fontSize: 18,
                color: colors.text,
              },
              headerStyle: { backgroundColor: colors.background },
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="settings" options={{ title: 'Settings' }} />
            <Stack.Screen name="products/add" options={{ title: 'Add product' }} />
            <Stack.Screen name="products/[id]" options={{ title: 'Product' }} />
            <Stack.Screen name="purchases/add" options={{ title: 'Add purchase' }} />
          </Stack>
        </ShopGate>
      </SQLiteProvider>
    </ThemeProvider>
  );
}
