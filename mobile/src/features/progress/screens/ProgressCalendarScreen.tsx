import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, AppState, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';
import { ContextualHeader } from '../../../components/ContextualHeader';
import { MainAppHeader } from '../../../components/MainAppHeader';
import { Button } from '../../courses/components/ui';
import { useGamification } from '../../gamification/hooks/useGamification';
import { gamificationResource } from '../../gamification/resource';
import { GamificationIcon } from '../../gamification/components/GamificationIcon';
import { CalendarResources, ProgressResource } from '../resource';
import { progressApi } from '../api';
import { CalendarCard, CalendarLegend } from '../components/CalendarCard';
import { shiftMonth } from '../presentation';
import { s } from '../components/styles';
import { colors } from '../../../theme';

export function ProgressCalendarScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'ProgressCalendar'>) {
  const gamification = useGamification();
  const contextResource = useMemo(() => new ProgressResource(async () => {
    await gamificationResource.ensureTimezone().catch(() => {});
    return progressApi.read(); // Fresh authoritative today; never infer it from the device.
  }), []);
  const context = useSyncExternalStore(contextResource.subscribe, contextResource.snapshot);
  const cache = useMemo(() => new CalendarResources(), []);
  const [month, setMonth] = useState<string | null>(null);
  useFocusEffect(useCallback(() => {
    void contextResource.refresh();
    let previous = AppState.currentState;
    const listener = AppState.addEventListener('change', next => {
      if (next === 'active' && previous !== 'active') { void contextResource.refresh(); void gamificationResource.refresh(); }
      previous = next;
    });
    return () => listener.remove();
  }, [contextResource]));
  const today = context.data?.consistency.today;
  useEffect(() => { if (today) setMonth(current => current && current <= today.slice(0, 7) ? current : today.slice(0, 7)); }, [today]);
  return <SafeAreaView style={s.page} edges={['top', 'bottom', 'left', 'right']}>
    <ContextualHeader backOnly backLabel="Volver a Progreso" onBack={() => navigation.goBack()} />
    <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={context.loading} onRefresh={() => {
      void contextResource.refresh(); void gamification.refresh(); if (month) void cache.month(month).refresh();
    }} tintColor={colors.blue} />}>
      <MainAppHeader data={gamification.data} loading={gamification.loading} error={gamification.error} onOpenShop={() => navigation.navigate('GamificationShop')} />
      <Text accessibilityRole="header" style={s.title}>Tu constancia</Text>
      <Text style={s.subtitle}>Tu historia de aprendizaje, día a día.</Text>
      {context.error ? <View style={s.error}><Text style={s.body}>{context.error}</Text><Button title="Reintentar" tone="blue" onPress={() => { void contextResource.refresh(); }} /></View> : null}
      {month && today ? <CalendarMonth month={month} today={today} cache={cache} onChange={setMonth} /> : !context.error ? <View style={s.loading}><ActivityIndicator color={colors.blue} /><Text style={s.body}>Cargando tu calendario…</Text></View> : null}
      <CalendarLegend />
      {gamification.data ? <View style={[s.card, s.pink]}><View style={s.row}><GamificationIcon kind="flame" size={48} /><View style={s.copy}><Text style={s.body}>Racha actual</Text><Text style={s.heading}>{gamification.data.streak.currentDays} {gamification.data.streak.currentDays === 1 ? 'día' : 'días'}</Text></View></View></View> : null}
      {gamification.error ? <Text accessibilityLiveRegion="polite" style={s.body}>{gamification.error} Desliza hacia abajo para reintentar.</Text> : null}
    </ScrollView>
  </SafeAreaView>;
}
export function CalendarMonth({ month, today, cache, onChange }: { month: string; today: string; cache: CalendarResources; onChange: (month: string) => void }) {
  const resource = cache.month(month), state = useSyncExternalStore(resource.subscribe, resource.snapshot);
  useFocusEffect(useCallback(() => { void resource.refresh(); }, [resource, today]));
  const authority = state.data?.today ?? today;
  return <>
    <CalendarCard month={month} today={authority} data={state.data} onPrevious={() => { if (month > '0001-01') onChange(shiftMonth(month, -1)); }} onNext={() => { const next = shiftMonth(month, 1); if (next <= authority.slice(0, 7)) onChange(next); }} />
    {state.loading ? <View accessibilityLiveRegion="polite" style={s.row}><ActivityIndicator color={colors.blue} /><Text style={s.body}>Actualizando calendario…</Text></View> : null}
    {state.error ? <View accessibilityLiveRegion="polite" style={s.error}><Text style={s.body}>{state.error}{state.data ? ' Mostramos la última lectura de este mes.' : ''}</Text><Button title="Reintentar" tone="blue" onPress={() => { void resource.refresh(); }} /></View> : null}
  </>;
}
