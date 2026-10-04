import { type ReactNode, useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';

import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { useShopDatabase } from '@/db/database';
import { getSettings } from '@/db/repositories/settings';
import { useAppStore } from '@/store/app-store';

export function ShopGate({ children }: { children: ReactNode }) {
  const db = useShopDatabase();
  const settings = useAppStore((state) => state.settings);
  const hydrated = useAppStore((state) => state.hydrated);
  const hydrate = useAppStore((state) => state.hydrate);
  const setSettings = useAppStore((state) => state.setSettings);

  useEffect(() => {
    let cancelled = false;

    getSettings(db)
      .then((row) => {
        if (!cancelled) {
          hydrate(row);
        }
      })
      .catch(() => {
        if (!cancelled) {
          hydrate(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [db, hydrate]);

  useEffect(() => {
    if (hydrated) {
      SplashScreen.hideAsync();
    }
  }, [hydrated]);

  if (!hydrated) {
    return null;
  }

  if (!settings) {
    return <OnboardingScreen db={db} onComplete={setSettings} />;
  }

  return children;
}
