import { useCallback, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { gamificationResource } from '../gamification/resource';
import { progressResource } from './resource';

export function useProgress() {
  const state = useSyncExternalStore(progressResource.subscribe, progressResource.snapshot);
  const refresh = useCallback(async () => {
    // Bootstrap owns timezone synchronization; read persisted authority even if bootstrap failed.
    await gamificationResource.ensureTimezone().catch(() => {});
    await progressResource.refresh();
  }, []);
  useFocusEffect(useCallback(() => {
    void refresh();
    let previous = AppState.currentState;
    const listener = AppState.addEventListener('change', next => {
      if (next === 'active' && previous !== 'active') { void refresh(); void gamificationResource.refresh(); }
      previous = next;
    });
    return () => listener.remove();
  }, [refresh]));
  return { ...state, refresh };
}
