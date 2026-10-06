import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import ChartNoAxesColumnIncreasing from 'lucide-react-native/icons/chart-no-axes-column-increasing';
import LockKeyhole from 'lucide-react-native/icons/lock-keyhole';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { CourseCover } from '../../courses/components/CourseCover';
import { colors } from '../../../theme';
import { courseDestination, courseStatus, type HomeDestination } from '../presentation';
import type { HomeCourse } from '../types';

export function HomeFeaturedCourses({ courses, onNavigate }: { courses: HomeCourse[]; onNavigate: (destination: HomeDestination) => void }) {
  const { fontScale } = useWindowDimensions();
  return <View style={s.section}>
    <View style={s.heading}><Text accessibilityRole="header" style={s.title}>Explorar cursos</Text>
      <Pressable accessibilityRole="button" onPress={() => onNavigate({ screen: 'Courses' })} style={s.all}><Text style={s.link}>Ver todos</Text><ChevronRight size={18} color={colors.blue} /></Pressable></View>
    {courses.length ? <View style={[s.row, fontScale >= 1.35 && { flexDirection: 'column' }]}>{courses.slice(0, 2).map(course => {
      const restricted = course.status === 'COMING_SOON' || (!course.access.hasFullAccess && !course.access.hasFreeContent);
      const detail = course.progress ? `${course.progress.completedRequiredNodes} de ${course.progress.totalRequiredNodes} pasos completados`
        : course.status === 'COMING_SOON' ? 'Un nuevo curso en camino' : course.access.hasFullAccess ? 'Acceso completo' : course.access.hasFreeContent ? 'Incluye contenido gratuito' : 'Consulta el acceso al curso';
      return <Pressable key={course.id} accessibilityRole="button" accessibilityLabel={`${course.title}. ${courseStatus(course)}${course.progress ? `. ${course.progress.percentage}% completado` : ''}`}
        onPress={() => onNavigate(courseDestination(course))} style={({ pressed }) => [s.card, { opacity: pressed ? .8 : 1 }]}>
        <CourseCover uri={course.coverUrl} level={course.level} hero style={s.cover} />
        <View style={s.body}><Text style={s.courseTitle}>{course.title}</Text><Text style={s.detail}>{detail}</Text>
          <View style={[s.badge, restricted && s.restricted]}>
            {restricted ? <LockKeyhole size={16} color={colors.gold} /> : <ChartNoAxesColumnIncreasing size={17} color={colors.blue} />}
            <Text style={[s.status, restricted && { color: colors.gold }]}>{course.progress && course.status !== 'COMING_SOON' ? `${course.progress.percentage}% · ${courseStatus(course)}` : courseStatus(course)}</Text>
            <ChevronRight size={15} color={restricted ? colors.gold : colors.blue} />
          </View>
        </View>
      </Pressable>;
    })}</View> : <Text style={s.detail}>Pronto encontrarás aquí nuevos cursos.</Text>}
  </View>;
}
const s = StyleSheet.create({
  section: { gap: 3 }, heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  title: { color: colors.ink, fontSize: 23, lineHeight: 29, fontWeight: '800', letterSpacing: -.6, flexShrink: 1 },
  all: { minHeight: 48, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 2, paddingHorizontal: 2 }, link: { color: colors.blue, fontSize: 14, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 12 },
  card: { flex: 1, minWidth: 0, borderRadius: 16, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5EDF8', overflow: 'hidden', shadowColor: '#3A5F92', shadowOffset: { width: 0, height: 2 }, shadowOpacity: .05, shadowRadius: 5, elevation: 1 },
  cover: { height: 102, width: '100%' }, body: { padding: 10, gap: 6, flex: 1 },
  courseTitle: { color: colors.ink, fontSize: 18, lineHeight: 23, fontWeight: '800', letterSpacing: -.3 },
  detail: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ECF5FF', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 7, marginTop: 'auto' },
  restricted: { backgroundColor: '#FFF4E2' }, status: { flex: 1, color: colors.blue, fontSize: 11, lineHeight: 16, fontWeight: '700' },
});
