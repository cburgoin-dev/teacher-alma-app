import { useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CoursesStackParamList } from '../../../navigation/types';
import { coursesApi } from '../api/courses';
import { useCourseResource } from '../hooks/useCourseResource';
import { catalogDestination, catalogLabel } from '../presentation';
import { colors, Cover, ProgressBar, ResourceState, styles } from '../components/ui';

export function CoursesScreen({ navigation }: NativeStackScreenProps<CoursesStackParamList, 'Courses'>) {
  const resource = useCourseResource(useCallback((signal: AbortSignal) => coursesApi.catalog(signal), []));
  return <SafeAreaView edges={['top']} style={styles.page}>
    <FlatList data={resource.error ? [] : resource.data?.courses ?? []} keyExtractor={course => course.id}
      contentContainerStyle={[styles.content, { flexGrow: 1 }]} refreshControl={<RefreshControl refreshing={resource.loading && !!resource.data} onRefresh={resource.retry} tintColor={colors.blue} />}
      ListHeaderComponent={<View style={local.header}><View accessible accessibilityLabel="La Teacher Alma"><Text style={local.brand}>La Teacher<Text style={local.alma}> Alma</Text></Text></View><Text style={styles.title}>Explorar cursos</Text><Text style={styles.body}>Elige tu próximo paso y sigue aprendiendo inglés.</Text></View>}
      ListEmptyComponent={<ResourceState loading={resource.loading} error={resource.error} retry={resource.error ? resource.retry : undefined} empty="Pronto encontrarás aquí nuevos cursos para aprender." />}
      renderItem={({ item: course }) => {
        const soon = course.status === 'COMING_SOON';
        const locked = !course.access.hasFullAccess && !course.access.hasFreeContent && !course.progress && !soon;
        const active = !!course.progress && course.progress.status !== 'NOT_STARTED';
        return <Pressable accessibilityRole="button" accessibilityLabel={course.title + '. ' + catalogLabel(course)} onPress={() => navigation.navigate(catalogDestination(course), { courseId: course.id })}
          style={({ pressed }) => [local.card, locked && local.lockedCard, { opacity: pressed ? .8 : 1 }]}>
          <Cover uri={course.coverUrl} level={course.level} style={local.thumbnail} />
          <View style={local.cardBody}><View style={local.titleRow}><Text style={local.cardTitle}>{course.title}</Text><Text style={local.chevron}>›</Text></View>
            {course.description ? <Text style={local.description} numberOfLines={2}>{course.description}</Text> : null}
            {course.progress ? <><Text style={local.meta}>{course.progress.completedLessons} de {course.progress.totalLessons} lecciones</Text><ProgressBar percentage={course.progress.percentage} red /></> : null}
            <View style={[local.cta, soon ? local.gray : locked ? local.gold : active ? local.red : local.blue]}><Text style={[local.ctaText, { color: soon ? colors.muted : locked ? colors.gold : active ? '#FFF' : colors.blue }]}>{catalogLabel(course)}{soon ? '' : '  →'}</Text></View>
          </View>
        </Pressable>;
      }} />
  </SafeAreaView>;
}
const local = StyleSheet.create({
  header: { gap: 10, marginBottom: 22 }, brand: { color: colors.blue, fontSize: 21, fontWeight: '800', marginBottom: 14 }, alma: { color: colors.red },
  card: { flexDirection: 'row', borderRadius: 18, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', backgroundColor: '#F7FAFF', marginBottom: 14 },
  lockedCard: { backgroundColor: '#FFFBF4', borderColor: '#F8EBD4' }, thumbnail: { width: '34%', minHeight: 165 },
  cardBody: { flex: 1, padding: 12, gap: 7 }, titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 }, cardTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.ink },
  chevron: { fontSize: 30, color: colors.muted }, description: { fontSize: 14, lineHeight: 19, color: colors.muted }, meta: { fontSize: 12, color: colors.muted },
  cta: { borderRadius: 25, paddingVertical: 11, paddingHorizontal: 8, marginTop: 'auto', minHeight: 44, justifyContent: 'center' }, ctaText: { textAlign: 'center', fontSize: 15, fontWeight: '700' },
  red: { backgroundColor: colors.red }, blue: { backgroundColor: '#DEEDFF' }, gold: { backgroundColor: colors.goldLight }, gray: { backgroundColor: '#E1E8F2' },
});
