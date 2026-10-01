import { useCallback, useSyncExternalStore } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { gamificationResource } from '../resource';
export function useGamification() {
  const state = useSyncExternalStore(gamificationResource.subscribe, gamificationResource.snapshot);
  useFocusEffect(useCallback(() => { void gamificationResource.refresh(); }, []));
  return { ...state, refresh: () => gamificationResource.refresh(true) };
}
