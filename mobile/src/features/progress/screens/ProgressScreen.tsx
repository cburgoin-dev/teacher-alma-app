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

export function ProgressScreen({ navigation }: CompositeScreenProps<BottomTabScreenProps<RootTabParamList, 'Progress'>, NativeStackScreenProps<RootStackParamList>>) {
  const progress = useProgress(), gamification = useGamification();
  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => { setRefreshing(true); try { await Promise.all([progress.refresh(), gamification.refresh()]); } finally { setRefreshing(false); } };
  return <SafeAreaView edges={['top', 'left', 'right']} style={s.page}>
    <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void refresh(); }} tintColor={colors.blue} />}>
      <MainAppHeader data={gamification.data} loading={gamification.loading} error={gamification.error} onOpenShop={() => navigation.navigate('GamificationShop')} />
      <View style={{ gap: 4 }}><Text accessibilityRole="header" style={s.title}>Tu progreso</Text><Text style={s.subtitle}>Así avanzas en tu camino de inglés.</Text></View>
      {progress.error ? <View style={s.error} accessibilityLiveRegion="polite"><Text style={s.body}>{progress.error}{progress.data ? ' Mostramos tu última información disponible.' : ''}</Text><Button title="Reintentar" tone="blue" onPress={() => { void refresh(); }} /></View> : null}
      {!progress.data && !progress.error ? <View style={s.loading}><ActivityIndicator color={colors.blue} /><Text style={s.body}>Cargando tu progreso…</Text></View> : null}
      {progress.data ? <>
        <ProgressCourseCard course={progress.data.course} onRoadmap={courseId => navigation.navigate('Roadmap', { courseId })} onCatalog={() => navigation.navigate('CoursesTab')} />
        <ProgressReviewCard review={progress.data.review} onReview={() => navigation.navigate('Review', {})} />
        <ProgressWeekCard week={progress.data.consistency} onCalendar={() => navigation.navigate('ProgressCalendar')} />
      </> : null}
      {gamification.error ? <Text accessibilityLiveRegion="polite" style={s.body}>{gamification.error} Desliza hacia abajo para reintentar.</Text> : null}
    </ScrollView>
  </SafeAreaView>;
}
