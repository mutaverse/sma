import * as Network from 'expo-network';

import { useSyncStore } from '@/store/sync-store';

function applyNetworkState(state: Network.NetworkState) {
  const online = Boolean(state.isConnected) && state.isInternetReachable !== false;
  const store = useSyncStore.getState();

  store.setOnline(online);

  if (!online) {
    store.setStatus('offline');
    return;
  }

  if (store.status === 'offline') {
    if (store.userId) {
      store.noteReconnect();
    } else {
      store.setStatus('local');
    }
  }
}

export async function startNetworkMonitor(): Promise<() => void> {
  const initial = await Network.getNetworkStateAsync();
  applyNetworkState(initial);

  const subscription = Network.addNetworkStateListener(applyNetworkState);
  return () => subscription.remove();
}
