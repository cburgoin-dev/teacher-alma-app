import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LearningIcon } from '../../lessons/components/LearningIcon';
import Svg, { Path } from 'react-native-svg';
import Check from 'lucide-react-native/icons/check';
import CalendarDays from 'lucide-react-native/icons/calendar-days';
import { Button } from '../../courses/components/ui';
import { ProgressArtwork } from './ProgressArtwork';
import { ProgressAction } from './ProgressAction';
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
  const stacked = width < 350 || fontScale > 1.3;
  const showLevel = course.level && !course.title.toUpperCase().split(/[^A-Z0-9]+/).includes(course.level.toUpperCase());
  return <View style={[s.card, c.hero]}>
    <View style={[c.heroRow, stacked && c.stacked]}><View style={c.information}><Text style={c.courseTitle}>{course.title}</Text>{showLevel ? <Text style={c.level}>Nivel {course.level}</Text> : null}
      <Text style={c.percent}>{course.progress.percentage}%</Text>
      <Text style={c.steps}>{course.progress.completedRequiredNodes} de {course.progress.totalRequiredNodes} pasos completados</Text>
      <View accessibilityRole="progressbar" accessibilityLabel="Progreso del curso" accessibilityValue={{ min: 0, max: 100, now: course.progress.percentage }} style={c.track}><View style={[c.fill, { width: `${course.progress.percentage}%` }]} /></View>
      <Text style={c.note}>{completed ? '¡Curso completado!' : '¡Vas muy bien! Sigue así.'}</Text>
    </View><View style={[c.artZone, stacked && c.artZoneStacked]}>
      <View style={[c.landscape, stacked && c.landscapeStacked]}><ProgressArtwork level={course.level} /></View>
      <ProgressAction title="Ver ruta" onPress={() => onRoadmap(course.id)} />
    </View></View>
  </View>;
}
export function ProgressReviewCard({ review, onReview }: { review: ProgressResponse['review']; onReview: () => void }) {
  const pending = review.pendingCount > 0;
  return <View style={[s.card, pending ? s.pink : c.clear]}>
    <View style={s.row}><View accessible={false} importantForAccessibility="no-hide-descendants" style={[s.badge, { backgroundColor: pending ? colors.red : '#D4F1E7' }, !pending && c.clearBadge]}>{pending ? <Svg width={29} height={29} viewBox="0 0 24 24" accessible={false}><Path d="M12 2a7 7 0 0 0-4.7 12.2C9 15.7 9 17 9 18h6c0-1 .1-2.3 1.7-3.8A7 7 0 0 0 12 2Z M9 20h6l-1.2 2h-3.6Z" fill="#FFF" /></Svg> : <View style={c.checkSeal}><Check size={27} strokeWidth={3} color="#FFF" /><View style={c.sealGleam} /></View>}</View>
      <View style={s.copy}><Text style={[s.heading, !pending && c.clearTitle]}>{pending ? 'Para reforzar' : 'Todo al día'}</Text><Text style={s.body}>{pending ? `${review.pendingCount} ${review.pendingCount === 1 ? 'ejercicio pendiente' : 'ejercicios pendientes'}` : 'Sin repasos pendientes. ¡Sigue así!'}</Text></View></View>
    {pending ? <>{review.groups.slice(0, 2).map((group, index) => <View key={group.topic.id} style={c.topic}>
      <View accessible={false} importantForAccessibility="no-hide-descendants" style={c.topicBadge}><LearningIcon kind={index === 0 ? 'chat' : 'bulb'} size={25} /></View><Text style={c.topicTitle}>{group.topic.title}</Text><Text accessibilityLabel={`${group.pendingCount} pendientes`} style={c.count}>{group.pendingCount}</Text>
    </View>)}<Button title="Ver repaso" arrow onPress={onReview} /></> : null}
  </View>;
}
export function ProgressWeekCard({ week, currentStreakDays = null, onCalendar }: { currentStreakDays?: number | null; week: ProgressResponse['consistency']; onCalendar: () => void }) {
  return <View style={[s.card, c.consistency]}>
    <View style={s.row}><View style={[s.badge, c.flameBadge]}><GamificationIcon kind="flame" size={32} /></View><View style={s.copy}><Text style={s.heading}>Tu constancia</Text><Text style={c.weekCopy}>{learningDaysLabel(week.learningDaysThisWeek)} esta semana</Text></View><View accessible={false} importantForAccessibility="no-hide-descendants" style={c.calendarDetail}><CalendarDays size={22} strokeWidth={2.2} color="#3C68A2" /></View></View>
    <View style={c.week}>{week.days.map((day, index) => <View key={day.date} accessible accessibilityLabel={dayLabel(day.date, day.state, week.today)} style={c.day}>
      <Text style={[c.weekday, day.state === 'LEARNED' && c.activeWeekday]}>{weekdays[index]}</Text><View style={[c.circle, day.state === 'LEARNED' && c.learned, day.date === week.today && c.today]}><DayMark state={day.state} size={23} future={day.date > week.today} /></View>
    </View>)}</View><View style={c.weekAction}><View style={c.streakChip}><Text style={c.streakLabel}>{currentStreakDays === null ? 'Racha actual: sin datos' : `Racha actual: ${currentStreakDays} ${currentStreakDays === 1 ? 'día' : 'días'}`}</Text></View><ProgressAction title="Ver calendario" onPress={onCalendar} /></View>
  </View>;
}
const c = StyleSheet.create({
  hero: { backgroundColor: '#EDF6FF', borderColor: '#CDE3FF', padding: 15, shadowColor: '#2764A5', shadowOffset: { width: 0, height: 3 }, shadowOpacity: .08, shadowRadius: 8, elevation: 2 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, stacked: { flexDirection: 'column', alignItems: 'stretch' },
  information: { flex: 1, minWidth: 0, gap: 5 }, courseTitle: { color: colors.blue, fontSize: 20, lineHeight: 25, fontWeight: '800' },
  percent: { color: colors.ink, fontWeight: '900', fontSize: 40, lineHeight: 46, letterSpacing: -1.5 },
  level: { color: colors.muted, fontSize: 12, lineHeight: 16 }, steps: { color: '#526F99', fontSize: 13, lineHeight: 18 }, note: { color: '#456A9F', fontSize: 13, lineHeight: 19, marginTop: 3 },
  artZone: { width: '40%', gap: 0, alignItems: 'stretch' }, artZoneStacked: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
  landscape: { width: '100%', marginBottom: 2 }, landscapeStacked: { width: 126 },
  track: { height: 10, borderRadius: 8, backgroundColor: '#CFDFF1', overflow: 'hidden', marginTop: 3 }, fill: { height: '100%', backgroundColor: colors.red, borderRadius: 8 },
  action: { alignSelf: 'flex-end', maxWidth: '100%' },
  weekAction: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 6 }, streakChip: { backgroundColor: '#E1EDFC', minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 24, paddingHorizontal: 10, paddingVertical: 8, flexShrink: 1, maxWidth: '100%' }, streakLabel: { color: '#2D578B', fontSize: 13, lineHeight: 19, fontWeight: '700' }, activeWeekday: { color: '#0062E9', fontWeight: '700' },
  clearBadge: { width: 54, height: 54, borderRadius: 20, borderWidth: 1, borderColor: '#BDE6D8' },
  checkSeal: { width: 37, height: 37, borderRadius: 13, backgroundColor: '#219574', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }], borderWidth: 2, borderColor: '#FFF', elevation: 2 },
  sealGleam: { position: 'absolute', top: 3, right: 4, width: 5, height: 5, borderRadius: 3, backgroundColor: '#B6EAD8' },
  clear: { backgroundColor: '#F0FAF6', borderColor: '#D3EBE2', paddingVertical: 14 }, clearTitle: { color: '#176551' },
  consistency: { backgroundColor: '#F1F7FF', gap: 12 }, flameBadge: { width: 42, height: 42 },
  weekCopy: { color: colors.muted, fontSize: 13, lineHeight: 18 }, calendarDetail: { alignSelf: 'flex-start', padding: 8, borderRadius: 16, backgroundColor: '#E2EEFF', borderWidth: 1, borderColor: '#D1E3FA' },
  topicBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E6F1FF', alignItems: 'center', justifyContent: 'center' },
  topic: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: '#FFF' },
  topicTitle: { flex: 1, color: colors.ink, fontSize: 15, lineHeight: 21, fontWeight: '700' },
  count: { color: colors.red, fontSize: 19, fontWeight: '800', backgroundColor: '#FFECEF', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  week: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }, day: { flex: 1, alignItems: 'center', gap: 6 }, weekday: { color: colors.muted, fontSize: 13 },
  circle: { borderWidth: 1.5, borderColor: 'transparent', borderRadius: 24, padding: 1, backgroundColor: '#E4EDF7' }, learned: { backgroundColor: '#FFE4E7' }, today: { borderColor: colors.blue },
});
