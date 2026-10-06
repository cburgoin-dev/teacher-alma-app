import { useState } from 'react';
import { Alert, ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import UserRound from 'lucide-react-native/icons/user-round';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, RootTabParamList } from '../../../navigation/types';
import { MainAppHeader } from '../../../components/MainAppHeader';
import { mainHeaderTopSpacing } from '../../../components/headerLayout';
import { Button } from '../../courses/components/ui';
import { useGamification } from '../../gamification/hooks/useGamification';
import { useHome } from '../useHome';
import { greetingSubtitle, type HomeDestination } from '../presentation';
import { HomeHeroCard } from '../components/HomeHeroCard';
import { HomeSecondaryCards } from '../components/HomeSecondaryCards';
import { HomeFeaturedCourses } from '../components/HomeFeaturedCourses';
import { colors } from '../../../theme';
import type { HomePreviewMode } from '../devPreview';
// Metro excludes these modules from production through the __DEV__ branch.
const previewTools = typeof __DEV__ !== 'undefined' && __DEV__ ? {
  ...require('../devPreview') as typeof import('../devPreview'),
  ...require('../components/HomePreviewControl') as typeof import('../components/HomePreviewControl'),
} : null;

export function HomeScreen({ navigation }: CompositeScreenProps<BottomTabScreenProps<RootTabParamList, 'Home'>, NativeStackScreenProps<RootStackParamList>>) {
  const home = useHome(), gamification = useGamification();
  const [refreshing, setRefreshing] = useState(false);
  const [previewMode, setPreviewMode] = useState<HomePreviewMode>('REAL');
  const [previewVisible, setPreviewVisible] = useState(true);
  const isPreview = !!previewTools && previewMode !== 'REAL';
  const refresh = async () => { setRefreshing(true); try { await Promise.all([home.refresh(), gamification.refresh()]); } finally { setRefreshing(false); } };
  const onNavigate = (destination: HomeDestination) => {
    if (isPreview) { Alert.alert('DEV · Vista previa', 'Los cursos de muestra no abren aprendizaje real. Selecciona REAL para navegar.'); return; }
    switch (destination.screen) {
      case 'Courses': navigation.navigate('CoursesTab'); break;
      case 'CourseDetail': navigation.navigate('CourseDetail', destination.params); break;
      case 'Roadmap': navigation.navigate('Roadmap', destination.params); break;
      case 'Review': navigation.navigate('Review', destination.params); break;
    }
  };
  const data = previewTools ? previewTools.previewHomeData(home.data, previewMode, true) : home.data;
  return <SafeAreaView edges={['top', 'left', 'right']} style={s.page}>
    <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void refresh(); }} tintColor={colors.blue} />}>
      <MainAppHeader data={gamification.data} loading={gamification.loading} error={gamification.error} onOpenShop={() => navigation.navigate('GamificationShop')} />
      {previewTools && previewVisible ? <previewTools.HomePreviewControl mode={previewMode} onSelect={setPreviewMode} onHide={() => setPreviewVisible(false)} /> : null}
      {!isPreview && home.error ? <View style={s.error} accessibilityLiveRegion="polite"><Text style={s.body}>{home.error}{data ? ' Mostramos tu última información disponible.' : ''}</Text><Button title="Reintentar" tone="blue" onPress={() => { void refresh(); }} /></View> : null}
      {!isPreview && !data && home.loading ? <View style={s.loading}><ActivityIndicator color={colors.blue} size="large" /><Text style={s.body}>Cargando tu inicio…</Text></View> : null}
      {data ? <>
        <View style={s.greeting}><View style={s.greetingCopy}><Text onLongPress={previewTools ? () => setPreviewVisible(true) : undefined} accessibilityHint={previewTools ? "Maintén pulsado para mostrar DEV Home preview" : undefined} accessibilityRole="header" numberOfLines={2} ellipsizeMode="tail" style={s.title}>Hola{data.learner.displayName?.trim() ? `, ${data.learner.displayName.trim()}` : ''} 👋</Text><Text style={s.subtitle}>{greetingSubtitle[data.state]}</Text></View>
          <View accessible={false} style={s.avatar}><UserRound color="#5787BD" size={32} /></View></View>
        <HomeHeroCard hero={data.hero} onNavigate={onNavigate} />
        <HomeSecondaryCards data={data} gamification={gamification.data} onNavigate={onNavigate} />
        {gamification.error ? <Text accessibilityLiveRegion="polite" style={s.body}>No se pudo actualizar tu progreso diario. Desliza hacia abajo para reintentar.</Text> : null}
        <HomeFeaturedCourses courses={data.featuredCourses} onNavigate={onNavigate} />
      </> : null}
    </ScrollView>
  </SafeAreaView>;
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFF' },
  content: { paddingHorizontal: 18, paddingTop: mainHeaderTopSpacing, paddingBottom: 22, gap: 10, width: '100%', maxWidth: 640, alignSelf: 'center', flexGrow: 1 },
  greeting: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 0, paddingBottom: 1 }, greetingCopy: { flex: 1, gap: 3 },
  title: { color: colors.ink, fontSize: 27, lineHeight: 33, fontWeight: '800', letterSpacing: -.7 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 21 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#DDEBFF', borderWidth: 3, borderColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  body: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  error: { backgroundColor: '#FFF4F4', borderRadius: 16, padding: 16, gap: 12 },
  loading: { paddingVertical: 64, gap: 16, alignItems: 'center' },
});
