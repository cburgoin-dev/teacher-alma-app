import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { CourseCover } from '../../courses/components/CourseCover';
import { colors, shadows } from '../../../theme';
import { courseDestination, courseStatus, type HomeDestination } from '../presentation';
import type { HomeCourse } from '../types';

export function HomeFeaturedCourses({ courses, onNavigate }: { courses: HomeCourse[]; onNavigate: (destination: HomeDestination) => void }) {
  const { fontScale } = useWindowDimensions();
  return <View style={s.section}>
    <View style={s.heading}><Text accessibilityRole="header" style={s.title}>Explorar cursos</Text>
      <Pressable accessibilityRole="button" onPress={() => onNavigate({ screen: 'Courses', initial: false })} style={s.all}><Text style={s.link}>Ver todos ›</Text></Pressable></View>
    {courses.length ? <View style={[s.row, fontScale >= 1.4 && { flexDirection: 'column' }]}>{courses.slice(0, 2).map(course => {
      const restricted = course.status === 'COMING_SOON' || (!course.access.hasFullAccess && !course.access.hasFreeContent);
      return <Pressable key={course.id} accessibilityRole="button" accessibilityLabel={`${course.title}. ${courseStatus(course)}`}
        onPress={() => onNavigate(courseDestination(course))} style={({ pressed }) => [s.card, { opacity: pressed ? .8 : 1 }]}>
        <CourseCover uri={course.coverUrl} level={course.level} hero style={s.cover} />
        <View style={s.body}><Text style={s.courseTitle}>{course.title}</Text>
          {course.progress ? <Text style={s.detail}>{course.progress.percentage}% completado</Text> : <Text style={s.detail}>{course.access.hasFullAccess ? 'Acceso completo' : course.access.hasFreeContent ? 'Incluye contenido gratuito' : course.status === 'COMING_SOON' ? 'Disponible próximamente' : 'Acceso requerido'}</Text>}
          <View style={[s.badge, restricted && s.restricted]}><Text style={[s.status, restricted && { color: colors.gold }]}>{courseStatus(course)}</Text></View>
        </View>
      </Pressable>;
    })}</View> : <Text style={s.detail}>Pronto encontrarás aquí nuevos cursos.</Text>}
  </View>;
}
const s = StyleSheet.create({
  section: { gap: 10 }, heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  title: { color: colors.ink, fontSize: 23, lineHeight: 29, fontWeight: '800', letterSpacing: -.5, flexShrink: 1 },
  all: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 4 }, link: { color: colors.blue, fontSize: 15, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 12 },
  card: { flex: 1, minWidth: 0, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadows.card },
  cover: { height: 116, width: '100%' }, body: { padding: 12, gap: 8, flex: 1 },
  courseTitle: { color: colors.ink, fontSize: 18, lineHeight: 24, fontWeight: '800' },
  detail: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  badge: { backgroundColor: '#EBF4FF', borderRadius: 14, paddingVertical: 9, paddingHorizontal: 8, marginTop: 'auto' },
  restricted: { backgroundColor: '#FFF4E1' }, status: { color: colors.blue, fontSize: 13, lineHeight: 18, fontWeight: '700' },
});
