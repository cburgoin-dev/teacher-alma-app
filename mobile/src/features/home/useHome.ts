import { useCallback, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { homeResource } from './resource';
import { gamificationResource } from '../gamification/resource';

export function useHome() {
  const state = useSyncExternalStore(homeResource.subscribe, homeResource.snapshot);
  useFocusEffect(useCallback(() => {
    void homeResource.refresh();
    let previous = AppState.currentState;
    const listener = AppState.addEventListener('change', next => {
      if (next === 'active' && previous !== 'active') {
        void homeResource.refresh(); void gamificationResource.refresh();
      }
      previous = next;
    });
    return () => listener.remove();
  }, []));
  return { ...state, refresh: homeResource.refresh };
}
