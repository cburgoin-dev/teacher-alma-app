import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import BookOpen from 'lucide-react-native/icons/book-open';
import ClipboardList from 'lucide-react-native/icons/clipboard-list';
import { Button } from '../../courses/components/ui';
import { CourseCover } from '../../courses/components/CourseCover';
import { GamificationIcon } from '../../gamification/components/GamificationIcon';
import type { ProgressCourse, ProgressResponse } from '../types';
import { dayLabel, learningDaysLabel, weekdays } from '../presentation';
import { DayMark } from './DayMark';
import { s } from './styles';
import { colors } from '../../../theme';

export function ProgressCourseCard({ course, onRoadmap, onCatalog }: { course: ProgressCourse | null; onRoadmap: (id: string) => void; onCatalog: () => void }) {
  const { width, fontScale } = useWindowDimensions();
  if (!course) return <View style={s.card}><Text style={s.heading}>Tu camino empieza aquí</Text><Text style={s.body}>Aún no tienes progreso de curso. Explora los cursos y empieza a aprender.</Text><Button title="Explorar cursos" tone="blue" arrow onPress={onCatalog} /></View>;
  const completed = course.progress.status === 'COMPLETED';
  return <View style={s.card}>
    <View style={s.row}><View style={s.copy}><Text style={c.courseTitle}>{course.title}</Text>{course.level ? <Text style={s.body}>Nivel {course.level}</Text> : null}
      <Text style={c.percent}>{course.progress.percentage}%</Text>
      <Text style={s.body}>{course.progress.completedRequiredNodes} de {course.progress.totalRequiredNodes} pasos completados</Text>
    </View>{width >= 360 && fontScale <= 1.3 ? <View importantForAccessibility="no-hide-descendants"><CourseCover uri={course.coverUrl} level={course.level} hero style={c.cover} /></View> : null}</View>
    <View accessibilityRole="progressbar" accessibilityLabel="Progreso del curso" accessibilityValue={{ min: 0, max: 100, now: course.progress.percentage }} style={c.track}><View style={[c.fill, { width: `${course.progress.percentage}%` }]} /></View>
    <Text style={s.subtitle}>{completed ? '¡Curso completado! Revisa lo que aprendiste.' : 'Sigue avanzando, paso a paso.'}</Text>
    <View style={c.action}><Button title="Ver ruta" tone="blue" arrow onPress={() => onRoadmap(course.id)} /></View>
  </View>;
}
export function ProgressReviewCard({ review, onReview }: { review: ProgressResponse['review']; onReview: () => void }) {
  const pending = review.pendingCount > 0;
  return <View style={[s.card, s.pink]}>
    <View style={s.row}><View accessible={false} importantForAccessibility="no-hide-descendants" style={[s.badge, { backgroundColor: colors.red }]}><ClipboardList size={27} color="#FFF" /></View>
      <View style={s.copy}><Text style={s.heading}>{pending ? 'Para reforzar' : 'Todo al día'}</Text><Text style={s.body}>{pending ? `${review.pendingCount} ${review.pendingCount === 1 ? 'ejercicio pendiente' : 'ejercicios pendientes'}. Refuerza lo aprendido con más seguridad.` : 'No tienes ejercicios pendientes de repaso.'}</Text></View></View>
    {pending ? <>{review.groups.slice(0, 2).map(group => <View key={group.topic.id} style={c.topic}>
      <View accessible={false} importantForAccessibility="no-hide-descendants"><BookOpen size={24} color={colors.blue} /></View><Text style={c.topicTitle}>{group.topic.title}</Text><Text accessibilityLabel={`${group.pendingCount} pendientes`} style={c.count}>{group.pendingCount}</Text>
    </View>)}<Button title="Ver repaso" arrow onPress={onReview} /></> : null}
  </View>;
}
export function ProgressWeekCard({ week, onCalendar }: { week: ProgressResponse['consistency']; onCalendar: () => void }) {
  return <View style={s.card}>
    <View style={s.row}><View style={s.badge}><GamificationIcon kind="flame" size={37} /></View><View style={s.copy}><Text style={s.heading}>Tu constancia</Text><Text style={s.body}>{learningDaysLabel(week.learningDaysThisWeek)} esta semana</Text></View></View>
    <View style={c.week}>{week.days.map((day, index) => <View key={day.date} accessible accessibilityLabel={dayLabel(day.date, day.state, week.today)} style={c.day}>
      <Text style={c.weekday}>{weekdays[index]}</Text><View style={[c.circle, day.state === 'LEARNED' && c.learned, day.date === week.today && c.today]}><DayMark state={day.state} size={23} future={day.date > week.today} /></View>
    </View>)}</View><Button title="Ver calendario" tone="blue" arrow onPress={onCalendar} />
  </View>;
}
const c = StyleSheet.create({
  courseTitle: { color: colors.blue, fontSize: 21, lineHeight: 27, fontWeight: '800' }, percent: { color: colors.ink, fontWeight: '900', fontSize: 42, lineHeight: 49 },
  cover: { width: 98, height: 105, borderRadius: 16 },
  track: { height: 12, borderRadius: 8, backgroundColor: '#D9E4F2', overflow: 'hidden' }, fill: { height: '100%', backgroundColor: colors.red, borderRadius: 8 },
  action: { alignSelf: 'flex-end', maxWidth: '100%' },
  topic: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: '#FFF' },
  topicTitle: { flex: 1, color: colors.ink, fontSize: 15, lineHeight: 21, fontWeight: '700' },
  count: { color: colors.red, fontSize: 19, fontWeight: '800', backgroundColor: '#FFECEF', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  week: { flexDirection: 'row', justifyContent: 'space-between' }, day: { flex: 1, alignItems: 'center', gap: 6 }, weekday: { color: colors.muted, fontSize: 13 },
  circle: { borderWidth: 1.5, borderColor: 'transparent', borderRadius: 24, padding: 1, backgroundColor: '#E4EDF7' }, learned: { backgroundColor: '#FFE4E7' }, today: { borderColor: colors.blue },
});
