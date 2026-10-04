import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Target from 'lucide-react-native/icons/target';
import BookOpen from 'lucide-react-native/icons/book-open';
import NotebookPen from 'lucide-react-native/icons/notebook-pen';
import { colors, shadows } from '../../../theme';
import { courseDestination, courseStatus, type HomeDestination } from '../presentation';
import type { HomeResponse } from '../types';
import type { GamificationAggregate } from '../../gamification/types';
import { presetLabel } from '../../gamification/presentation';

export function HomeSecondaryCards({ data, gamification, onNavigate }: { data: HomeResponse; gamification: GamificationAggregate | null; onNavigate: (destination: HomeDestination) => void }) {
  const { fontScale } = useWindowDimensions();
  const hero = data.hero;
  let title: string, detail: string, action: string | null = null, destination: HomeDestination | null = null;
  if (hero.type === 'NEW') {
    const beginner = hero.beginnerCourse;
    title = beginner ? `Empieza con ${beginner.level ?? beginner.title}` : 'Encuentra tu curso';
    detail = beginner ? courseStatus(beginner) : 'Explora los cursos disponibles a tu ritmo.';
    destination = beginner ? courseDestination(beginner) : { screen: 'Courses', initial: false };
    action = 'Ver curso' + (beginner ? '' : 's');
  } else if (hero.type === 'ASSESSED') {
    title = 'Tu diagnóstico'; detail = hero.diagnostic.recommendedLevel ? `Nivel recomendado: ${hero.diagnostic.recommendedLevel}` : 'Diagnóstico completado';
  } else if (data.review.pendingCount > 0) {
    title = 'Repaso'; detail = `${data.review.pendingCount} ${data.review.pendingCount === 1 ? 'ejercicio pendiente' : 'ejercicios pendientes'}`;
    destination = { screen: 'Review', params: {}, initial: false }; action = 'Empezar ahora';
  } else { title = 'Práctica'; detail = 'Más formas de practicar, muy pronto.'; }
  const goal = gamification?.dailyGoal;
  const ratio = goal && goal.target > 0 ? Math.min(100, Math.max(0, goal.progress / goal.target * 100)) : 0;
  const left = <><View style={s.redIcon}>{title === 'Repaso' ? <NotebookPen size={27} color={colors.red} /> : <BookOpen size={27} color={colors.red} />}</View>
    <Text style={s.title}>{title}</Text><Text style={s.detail}>{detail}</Text>
    {action ? <Text style={s.action}>{action} →</Text> : null}</>;
  return <View style={[s.row, fontScale >= 1.4 && s.stacked]}>
    {destination ? <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${detail}. ${action}`} onPress={() => onNavigate(destination!)} style={({ pressed }) => [s.card, s.red, { opacity: pressed ? .8 : 1 }]}>{left}</Pressable>
      : <View style={[s.card, s.red]}>{left}</View>}
    <View style={[s.card, s.blue]}>
      <View style={s.blueIcon}><Target size={30} color={colors.blue} /></View>
      <Text style={s.title}>{hero.type === 'NEW' ? 'Tu primera meta' : 'Meta diaria'}</Text>
      {goal ? <><Text style={s.detail}>{goal.completed ? '¡Meta completada!' : `Meta ${presetLabel[goal.preset].toLowerCase()}`}</Text>
        <Text style={s.ratio}>{goal.progress} / {goal.target} sesiones</Text>
        <View accessibilityRole="progressbar" accessibilityLabel="Meta diaria" accessibilityValue={{ text: `${goal.progress} de ${goal.target} sesiones${goal.completed ? '. Completada' : ''}` }} style={s.track}>
          <View style={[s.fill, { width: `${ratio}%` }]} /></View></>
        : <Text style={s.detail}>Tu meta estará aquí cuando se cargue tu progreso.</Text>}
    </View>
  </View>;
}
const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'stretch' }, stacked: { flexDirection: 'column' },
  card: { flex: 1, minWidth: 0, borderRadius: 20, borderWidth: 1, padding: 14, gap: 8, ...shadows.card },
  red: { backgroundColor: '#FFF7F8', borderColor: '#FFE1E7' }, blue: { backgroundColor: '#F0F7FF', borderColor: '#D9E9FF' },
  redIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFE4EA', alignItems: 'center', justifyContent: 'center' },
  blueIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#D9EBFF', alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.ink, fontSize: 17, lineHeight: 22, fontWeight: '800' },
  detail: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  action: { color: colors.red, fontSize: 14, lineHeight: 20, fontWeight: '700', marginTop: 'auto', paddingTop: 8 },
  ratio: { color: colors.blue, fontWeight: '700', fontSize: 13, lineHeight: 19, marginTop: 'auto' },
  track: { height: 9, backgroundColor: '#D5E4F5', borderRadius: 9, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.blue, borderRadius: 9 },
});
