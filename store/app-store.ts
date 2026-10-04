import { create } from 'zustand';

import type { AppSettings } from '@/types/domain';

type AppState = {
  settings: AppSettings | null;
  hydrated: boolean;
  hydrate: (settings: AppSettings | null) => void;
  setSettings: (settings: AppSettings) => void;
};

export const useAppStore = create<AppState>((set) => ({
  settings: null,
  hydrated: false,
  hydrate: (settings) => set({ settings, hydrated: true }),
  setSettings: (settings) => set({ settings, hydrated: true }),
}));
