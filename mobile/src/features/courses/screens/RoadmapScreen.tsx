import { useCallback } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CoursesStackParamList } from '../../../navigation/types';
import { coursesApi } from '../api/courses';
import { useCourseResource } from '../hooks/useCourseResource';
import { lessonState } from '../presentation';
import { colors, ProgressBar, ResourceState, styles } from '../components/ui';
import { showAccessInfo } from '../components/accessInfo';
import { CoursePath } from '../components/CoursePath';
import type { Lesson } from '../types';

function openLesson(lesson: Lesson) {
  const state = lessonState(lesson);
  if (state === 'LOCKED_PREREQUISITE') Alert.alert('Una lección a la vez', 'Completa primero la lección anterior de la ruta para desbloquear esta lección.');
  else if (state === 'LOCKED_ACCESS') showAccessInfo();
  else Alert.alert(lesson.title, 'Las lecciones todavía no están disponibles en esta versión. Tu progreso no se ha modificado.');
}
export function RoadmapScreen({ route }: NativeStackScreenProps<CoursesStackParamList, 'Roadmap'>) {
  const resource = useCourseResource(useCallback((signal: AbortSignal) => coursesApi.roadmap(route.params.courseId, signal), [route.params.courseId]));
  if ((!resource.data && resource.loading) || resource.error || !resource.data) return <View style={styles.page}><ResourceState loading={resource.loading} error={resource.error} retry={resource.retry} /></View>;
  const roadmap = resource.data;

  return <ScrollView style={styles.page} contentContainerStyle={local.content}
    refreshControl={<RefreshControl refreshing={resource.loading} onRefresh={resource.retry} tintColor={colors.blue} />}>
    <View style={local.summary}>
      <Text style={local.courseChip}>{roadmap.course.title}</Text>
      <ProgressBar percentage={roadmap.progress.percentage} />
      <Text style={local.summaryText}>{roadmap.progress.completedLessons} de {roadmap.progress.totalLessons} lecciones completadas</Text>
    </View>
    {roadmap.progress.totalLessons > 0 && roadmap.progress.completedLessons === roadmap.progress.totalLessons
      ? <Text style={local.complete}>¡Curso completado! Tu ruta sigue aquí para repasar.</Text> : null}
    {!roadmap.topics.length ? <ResourceState empty="La ruta de este curso estará disponible próximamente." /> : <View style={local.map}><CoursePath topics={roadmap.topics} onLessonPress={openLesson} /></View>}
  </ScrollView>;
}
const local = StyleSheet.create({
  content: { paddingTop: 6, paddingBottom: 16, width: '100%', maxWidth: 640, alignSelf: 'center' },
  summary: { paddingHorizontal: 20, gap: 9, paddingBottom: 14 },
  courseChip: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#E3F0FF', color: colors.blue, fontWeight: '700', fontSize: 13, lineHeight: 18 },
  summaryText: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  complete: { color: colors.blue, backgroundColor: colors.pale, padding: 14, borderRadius: 18, fontSize: 15, marginHorizontal: 20, marginBottom: 14 },
  map: { paddingHorizontal: 18 },
});
