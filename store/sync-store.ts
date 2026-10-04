import { create } from 'zustand';

export type SyncStatus = 'offline' | 'local' | 'paused' | 'syncing' | 'synced' | 'failed';

type SyncState = {
  status: SyncStatus;
  online: boolean;
  configured: boolean;
  email: string | null;
  userId: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  reconnectAt: number;
  setStatus: (status: SyncStatus) => void;
  setOnline: (online: boolean) => void;
  setConfigured: (configured: boolean) => void;
  setBackupAccount: (account: { email: string | null; userId: string | null }) => void;
  setLastSyncedAt: (value: string | null) => void;
  setLastError: (value: string | null) => void;
  noteReconnect: () => void;
};

export const useSyncStore = create<SyncState>((set) => ({
  status: 'local',
  online: true,
  configured: false,
  email: null,
  userId: null,
  lastSyncedAt: null,
  lastError: null,
  reconnectAt: 0,
  setStatus: (status) => set({ status }),
  setOnline: (online) => set({ online }),
  setConfigured: (configured) => set({ configured }),
  setBackupAccount: (account) => set({ email: account.email, userId: account.userId }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
  setLastError: (lastError) => set({ lastError }),
  noteReconnect: () => set((state) => ({ reconnectAt: state.reconnectAt + 1 })),
}));
