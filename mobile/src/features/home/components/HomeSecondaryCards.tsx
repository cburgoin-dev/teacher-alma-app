import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Target from 'lucide-react-native/icons/target';
import BookOpen from 'lucide-react-native/icons/book-open';
import NotebookPen from 'lucide-react-native/icons/notebook-pen';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { colors } from '../../../theme';
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
    detail = beginner ? courseStatus(beginner) : 'Explora los cursos a tu ritmo.';
    destination = beginner ? courseDestination(beginner) : { screen: 'Courses' };
    action = beginner ? 'Ver curso' : 'Ver cursos';
  } else if (hero.type === 'ASSESSED') {
    title = 'Tu diagnóstico'; detail = hero.diagnostic.recommendedLevel ? `Nivel recomendado: ${hero.diagnostic.recommendedLevel}` : 'Diagnóstico completado';
  } else if (data.review.pendingCount > 0) {
    title = 'Repaso'; detail = `${data.review.pendingCount} ${data.review.pendingCount === 1 ? 'ejercicio pendiente' : 'ejercicios pendientes'}`;
    destination = { screen: 'Review', params: {} }; action = 'Empezar ahora';
  } else { title = 'Práctica'; detail = 'Más formas de practicar, muy pronto.'; }
  const goal = gamification?.dailyGoal;
  const ratio = goal && goal.target > 0 ? Math.min(100, Math.max(0, goal.progress / goal.target * 100)) : 0;
  const left = <>
    <View style={s.cardTop}><View accessible={false} style={[s.iconHalo, s.redHalo]}><View style={[s.iconCore, s.redCore]}>{title === 'Repaso' ? <NotebookPen size={23} color="#FFF" /> : <BookOpen size={23} color="#FFF" />}</View></View>
      <View style={s.copy}><View style={s.titleRow}><Text style={s.title}>{title}</Text>{destination ? <ChevronRight size={15} color={colors.muted} /> : null}</View><Text style={s.detail}>{detail}</Text></View>
    </View>
    {action ? <View style={s.actionPill}><Text style={s.action}>{action} →</Text></View> : null}
  </>;
  return <View style={[s.row, fontScale >= 1.35 && s.stacked]}>
    {destination ? <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${detail}. ${action}`} onPress={() => onNavigate(destination!)} style={({ pressed }) => [s.card, s.red, { opacity: pressed ? .8 : 1 }]}>{left}</Pressable>
      : <View style={[s.card, s.red]}>{left}</View>}
    <View style={[s.card, s.blue]}>
      <View style={s.cardTop}><View accessible={false} style={[s.iconHalo, s.blueHalo]}><View style={[s.iconCore, s.blueCore]}><Target size={27} color={colors.blue} /></View></View>
        <View style={s.copy}><Text style={s.title}>{hero.type === 'NEW' ? 'Tu primera meta' : 'Meta diaria'}</Text>
          <Text style={s.detail}>{goal ? goal.completed ? '¡Meta completada!' : `Meta ${presetLabel[goal.preset].toLowerCase()}` : 'Aún sin cargar'}</Text></View>
      </View>
      {goal ? <View style={s.goalFooter}>
        <Text style={s.ratio}>{goal.progress} / {goal.target} sesiones</Text>
        <View accessibilityRole="progressbar" accessibilityLabel="Meta diaria" accessibilityValue={{ text: `${goal.progress} de ${goal.target} sesiones${goal.completed ? '. Completada' : ''}` }} style={s.progressRow}>
          <View style={s.track}><View style={[s.fill, { width: `${ratio}%` }]} /></View><Text style={s.percent}>{Math.round(ratio)}%</Text>
        </View>
      </View> : <Text style={s.detail}>Tu progreso aparecerá aquí.</Text>}
    </View>
  </View>;
}
const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, alignItems: 'stretch' }, stacked: { flexDirection: 'column' },
  card: { flex: 1, minWidth: 0, borderRadius: 17, borderWidth: 1, padding: 11, gap: 9 },
  red: { backgroundColor: '#FFF7F8', borderColor: '#FFE1E7' }, blue: { backgroundColor: '#F1F8FF', borderColor: '#D6E8FD' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 }, copy: { flex: 1, minWidth: 0, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  iconHalo: { width: 42, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  iconCore: { width: 33, height: 37, borderRadius: 17, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-7deg' }] },
  redHalo: { backgroundColor: '#FFE3E9' }, redCore: { backgroundColor: '#FF3B58' }, blueHalo: { backgroundColor: '#DBECFF' }, blueCore: { backgroundColor: '#C0DEFF' },
  title: { color: colors.ink, fontSize: 15, lineHeight: 20, fontWeight: '800', flexShrink: 1, letterSpacing: -.2 },
  detail: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  actionPill: { backgroundColor: '#FFE8ED', borderRadius: 18, paddingVertical: 6, paddingHorizontal: 5, alignItems: 'center', marginTop: 'auto' },
  action: { color: colors.red, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  goalFooter: { gap: 5, marginTop: 'auto' }, ratio: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  progressRow: { flexDirection: 'row', gap: 5, alignItems: 'center' }, percent: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  track: { flex: 1, height: 9, backgroundColor: '#D5E4F5', borderRadius: 9, overflow: 'hidden' }, fill: { height: '100%', backgroundColor: '#087DF5', borderRadius: 9 },
});
