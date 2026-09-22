import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colors, radius, shadows } from '../../../theme';
import { NavigationIcon } from '../../../components/NavigationIcon';
import { catalogLabel } from '../presentation';
import type { CatalogCourse } from '../types';
import { Cover, ProgressBar } from './ui';
import { CourseVisualIcon } from './CourseVisualIcon';

export function CourseCard({ course, onPress }: { course: CatalogCourse; onPress: () => void }) {
  const { fontScale } = useWindowDimensions();
  const scale = Math.max(1, Math.min(fontScale, 1.5));
  const soon = course.status === 'COMING_SOON';
  const locked = !course.access.hasFullAccess && !course.access.hasFreeContent && !course.progress && !soon;
  const active = !!course.progress && course.progress.status !== 'NOT_STARTED';
  const tint = soon ? colors.muted : locked ? colors.gold : active ? '#FFF' : colors.blue;
  const background = soon ? '#E0E7F1' : locked ? colors.goldLight : active ? colors.red : '#DBEBFF';
  const metadata = course.progress
    ? `${course.progress.completedLessons} de ${course.progress.totalLessons} lecciones`
    : soon ? 'Próximamente' : course.access.hasFullAccess ? 'Acceso completo' : course.access.hasFreeContent ? 'Incluye contenido gratuito' : 'Acceso requerido';

  return <Pressable accessibilityRole="button" accessibilityLabel={course.title + '. ' + catalogLabel(course)}
    onPress={onPress} style={({ pressed }) => [s.shadow, { opacity: pressed ? .82 : 1 }]}>
    <View style={[s.card, { height: 188 + 130 * (scale - 1) }, locked && s.locked]}>
      <Cover uri={course.coverUrl} level={course.level} style={s.cover} badge={soon ? 'soon' : locked ? 'premium' : undefined} />
      <View style={s.body}>
        <View style={s.titleRow}>
          <Text numberOfLines={2} ellipsizeMode="tail" maxFontSizeMultiplier={1.5} style={s.title}>{course.title}</Text>
          <Text style={s.chevron} accessible={false}>›</Text>
        </View>
        <Text numberOfLines={2} maxFontSizeMultiplier={1.5} style={[s.description, { minHeight: 38 * scale }]}>{course.description ?? ''}</Text>
        <View style={s.metadata}>
          <NavigationIcon name="CoursesTab" color={colors.muted} size={15} />
          <Text numberOfLines={1} maxFontSizeMultiplier={1.5} style={s.meta}>{metadata}</Text>
        </View>
        {course.progress ? <View style={s.progressSlot}><ProgressBar percentage={course.progress.percentage} red compact /></View> : null}
        <View style={[s.cta, { backgroundColor: background }]}>
          <Text maxFontSizeMultiplier={1.5} numberOfLines={1} style={[s.ctaLabel, { color: tint }]}>{catalogLabel(course)}</Text>
          {!soon ? <CourseVisualIcon name="arrow" color={tint} size={19} /> : null}
        </View>
      </View>
    </View>
  </Pressable>;
}
const s = StyleSheet.create({
  shadow: { ...shadows.card, borderRadius: radius.card, backgroundColor: '#FFF' },
  card: { flexDirection: 'row', borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', backgroundColor: '#F6FAFF' },
  locked: { backgroundColor: '#FFFBF5', borderColor: '#F5E6CF' },
  cover: { width: '37%', alignSelf: 'stretch' },
  body: { flex: 1, padding: 9, gap: 4, justifyContent: 'center' },
  titleRow: { flexDirection: 'row', gap: 4, alignItems: 'flex-start' },
  title: { flex: 1, fontSize: 18, lineHeight: 22, includeFontPadding: false, fontWeight: '800', letterSpacing: -.25, color: colors.ink },
  chevron: { color: colors.muted, fontSize: 25, lineHeight: 25, marginTop: 3 },
  description: { fontSize: 14, lineHeight: 19, includeFontPadding: false, color: colors.muted },
  metadata: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta: { flex: 1, fontSize: 13, lineHeight: 18, color: colors.muted },
  progressSlot: { justifyContent: 'center' },
  cta: { borderRadius: 30, minHeight: 37, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 7, paddingHorizontal: 8 },
  ctaLabel: { fontSize: 14, lineHeight: 20, fontWeight: '700', flexShrink: 1 },
});
