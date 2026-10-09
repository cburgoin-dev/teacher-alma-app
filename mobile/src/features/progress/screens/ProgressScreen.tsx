import { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, RootTabParamList } from '../../../navigation/types';
import { MainAppHeader } from '../../../components/MainAppHeader';
import { Button } from '../../courses/components/ui';
import { useGamification } from '../../gamification/hooks/useGamification';
import { useProgress } from '../useProgress';
import { ProgressCourseCard, ProgressReviewCard, ProgressWeekCard } from '../components/ProgressCards';
import { s } from '../components/styles';
import { colors } from '../../../theme';

import type { DashboardMode } from '../devPreview';
const previewTools = typeof __DEV__ !== 'undefined' && __DEV__ ? {
  ...require('../devPreview') as typeof import('../devPreview'),
  ...require('../components/ProgressPreviewControl') as typeof import('../components/ProgressPreviewControl'),
} : null;

export function ProgressScreen({ navigation }: CompositeScreenProps<BottomTabScreenProps<RootTabParamList, 'Progress'>, NativeStackScreenProps<RootStackParamList>>) {
  const progress = useProgress(), gamification = useGamification();
  const [mode, setMode] = useState<DashboardMode>('REAL');
  const [previewVisible, setPreviewVisible] = useState(true);
  const isPreview = !!previewTools && mode !== 'REAL';
  const data = previewTools ? previewTools.dashboardPreview(progress.data, mode, true) : progress.data;
  const currentStreakDays = isPreview ? previewTools!.dashboardPreviewStreak[mode as Exclude<DashboardMode, 'REAL'>] : gamification.data?.streak.currentDays ?? null;
  const headerData = isPreview && gamification.data ? { ...gamification.data, streak: { ...gamification.data.streak, currentDays: currentStreakDays! } } : gamification.data;
  const guarded = (action: () => void) => { if (isPreview) previewTools!.blockPreviewNavigation(); else action(); };
  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => { setRefreshing(true); try { await Promise.all([progress.refresh(), gamification.refresh()]); } finally { setRefreshing(false); } };
  return <SafeAreaView edges={['top', 'left', 'right']} style={s.page}>
    <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void refresh(); }} tintColor={colors.blue} />}>
      <MainAppHeader data={headerData} loading={gamification.loading} error={gamification.error} onOpenShop={() => guarded(() => navigation.navigate('GamificationShop'))} />
      <View style={{ gap: 4 }}><Text onLongPress={previewTools ? () => setPreviewVisible(true) : undefined} accessibilityRole="header" style={s.title}>Tu progreso</Text><Text style={s.subtitle}>Así avanzas en tu camino de inglés.</Text></View>
      {previewTools && previewVisible ? <previewTools.ProgressPreviewControl mode={mode} modes={previewTools.dashboardModes} onSelect={setMode} onHide={() => setPreviewVisible(false)} /> : null}
      {!isPreview && progress.error ? <View style={s.error} accessibilityLiveRegion="polite"><Text style={s.body}>{progress.error}{progress.data ? ' Mostramos tu última información disponible.' : ''}</Text><Button title="Reintentar" tone="blue" onPress={() => { void refresh(); }} /></View> : null}
      {!data && !progress.error ? <View style={s.loading}><ActivityIndicator color={colors.blue} /><Text style={s.body}>Cargando tu progreso…</Text></View> : null}
      {data ? <>
        <ProgressCourseCard course={data.course} onRoadmap={courseId => guarded(() => navigation.navigate('Roadmap', { courseId }))} onCatalog={() => guarded(() => navigation.navigate('CoursesTab'))} />
        <ProgressReviewCard review={data.review} onReview={() => guarded(() => navigation.navigate('Review', {}))} />
        <ProgressWeekCard currentStreakDays={currentStreakDays} week={data.consistency} onCalendar={() => navigation.navigate('ProgressCalendar')} />
      </> : null}
      {gamification.error ? <Text accessibilityLiveRegion="polite" style={s.body}>{gamification.error} Desliza hacia abajo para reintentar.</Text> : null}
    </ScrollView>
  </SafeAreaView>;
}
