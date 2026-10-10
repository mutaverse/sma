import { type ReactNode, useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import type { Session } from '@supabase/supabase-js';

import { AppLoadingScreen } from '@/components/AppLoadingScreen';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import {
  authRequired,
  DEFAULT_CURRENCY_CODE,
  DEFAULT_CURRENCY_SYMBOL,
  DEFAULT_TIMEZONE,
} from '@/constants/config';
import { useShopDatabase } from '@/db/database';
import { getSettings, upsertSettings } from '@/db/repositories/settings';
import { hydrateBackupSession } from '@/lib/backup-session';
import { getSupabaseClient } from '@/lib/supabase';
import { useAppStore } from '@/store/app-store';
import { useSyncStore } from '@/store/sync-store';

const MINIMUM_LOADING_TIME_MS = 900;

export function ShopGate({ children }: { children: ReactNode }) {
  const db = useShopDatabase();
  const settings = useAppStore((state) => state.settings);
  const hydrated = useAppStore((state) => state.hydrated);
  const hydrate = useAppStore((state) => state.hydrate);
  const setSettings = useAppStore((state) => state.setSettings);
  const [minimumTimeElapsed, setMinimumTimeElapsed] = useState(false);
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [preparingShop, setPreparingShop] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) {
        setMinimumTimeElapsed(true);
      }
    }, MINIMUM_LOADING_TIME_MS);

    void SplashScreen.hideAsync();

    Promise.all([
      getSettings(db),
      authRequired ? hydrateBackupSession() : Promise.resolve(null),
    ])
      .then(([row, restoredSession]) => {
        if (!cancelled) {
          hydrate(row);
          setSession(restoredSession);
        }
      })
      .catch(() => {
        if (!cancelled) {
          hydrate(null);
          setSession(null);
        }
      });

    const subscription = authRequired
      ? getSupabaseClient()?.auth.onAuthStateChange((_event, nextSession) => {
      if (cancelled) {
        return;
      }

      setSession(nextSession);
      useSyncStore.getState().setBackupAccount({
        email: nextSession?.user.email ?? nextSession?.user.phone ?? null,
        userId: nextSession?.user.id ?? null,
      });
        })
      : undefined;

    return () => {
      cancelled = true;
      clearTimeout(timer);
      subscription?.data.subscription.unsubscribe();
    };
  }, [db, hydrate]);

  useEffect(() => {
    if (!hydrated || !session || settings) {
      return;
    }

    let cancelled = false;
    setPreparingShop(true);
    const companyName =
      typeof session.user.user_metadata.company_name === 'string'
        ? session.user.user_metadata.company_name.trim()
        : '';

    upsertSettings(db, {
      businessName: companyName || 'My Shop',
      currencyCode: DEFAULT_CURRENCY_CODE,
      currencySymbol: DEFAULT_CURRENCY_SYMBOL,
      timezone: DEFAULT_TIMEZONE,
    })
      .then((nextSettings) => {
        if (!cancelled) {
          setSettings(nextSettings);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPreparingShop(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [db, hydrated, session, setSettings, settings]);

  async function handleAuthenticated(nextSession: Session, companyName?: string) {
    useSyncStore.getState().setBackupAccount({
      email: nextSession.user.email ?? nextSession.user.phone ?? null,
      userId: nextSession.user.id,
    });

    if (companyName) {
      const nextSettings = await upsertSettings(db, {
        businessName: companyName,
        currencyCode: DEFAULT_CURRENCY_CODE,
        currencySymbol: DEFAULT_CURRENCY_SYMBOL,
        timezone: DEFAULT_TIMEZONE,
      });
      setSettings(nextSettings);
    }

    setSession(nextSession);
  }

  const sessionPending = authRequired && session === undefined;
  if (!hydrated || sessionPending || !minimumTimeElapsed || preparingShop) {
    return <AppLoadingScreen />;
  }

  if (authRequired && !session) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  if (!settings) {
    return <OnboardingScreen db={db} onComplete={setSettings} />;
  }

  return children;
}
