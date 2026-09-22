import { useCallback } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CoursesStackParamList } from '../../../navigation/types';
import { coursesApi } from '../api/courses';
import { useCourseResource } from '../hooks/useCourseResource';
import { lessonState } from '../presentation';
import { colors, ProgressBar, ResourceState, styles } from '../components/ui';
import { showAccessInfo } from '../components/accessInfo';
import { TopicPath } from '../components/TopicPath';
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
  let globalIndex = 0;
  return <ScrollView style={styles.page} contentContainerStyle={local.content}
    refreshControl={<RefreshControl refreshing={resource.loading} onRefresh={resource.retry} tintColor={colors.blue} />}>
    <View style={local.summary}>
      <Text style={local.courseChip}>{roadmap.course.title}</Text>
      <ProgressBar percentage={roadmap.progress.percentage} />
      <Text style={local.summaryText}>{roadmap.progress.completedLessons} de {roadmap.progress.totalLessons} lecciones completadas</Text>
    </View>
    {roadmap.progress.totalLessons > 0 && roadmap.progress.completedLessons === roadmap.progress.totalLessons
      ? <Text style={local.complete}>¡Curso completado! Tu ruta sigue aquí para repasar.</Text> : null}
    {!roadmap.topics.length ? <ResourceState empty="La ruta de este curso estará disponible próximamente." /> : roadmap.topics.map((topic, topicIndex) => {
      const startIndex = globalIndex;
      globalIndex += topic.lessons.length;
      return <View key={topic.id} style={local.map}>
        <View pointerEvents="none" accessible={false} style={local.scenery}>
          <View style={[local.cloud, topicIndex % 2 === 0 ? { top: 80, left: -170 } : { bottom: 0, right: -175 }, { backgroundColor: topicIndex % 2 === 0 ? '#F0F8FF' : '#F0F8F3' }]} />
        </View>
        <View style={local.topicHeader}>
          <View style={local.topicBadge}><Text style={local.topicNumber}>{topicIndex + 1}</Text></View>
          <View style={{ flex: 1 }}><Text style={local.eyebrow}>TEMA {topicIndex + 1}</Text><Text style={local.topicTitle}>{topic.title}</Text></View>
        </View>
        <TopicPath lessons={topic.lessons} startIndex={startIndex} onLessonPress={openLesson} />
      </View>;
    })}
  </ScrollView>;
}
const local = StyleSheet.create({
  content: { paddingTop: 6, paddingBottom: 16, width: '100%', maxWidth: 640, alignSelf: 'center' },
  summary: { paddingHorizontal: 20, gap: 9, paddingBottom: 14 },
  courseChip: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#E3F0FF', color: colors.blue, fontWeight: '700', fontSize: 13, lineHeight: 18 },
  summaryText: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  complete: { color: colors.blue, backgroundColor: colors.pale, padding: 14, borderRadius: 18, fontSize: 15, marginHorizontal: 20, marginBottom: 14 },
  map: { paddingHorizontal: 18 },
  scenery: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, overflow: 'hidden' },
  cloud: { position: 'absolute', width: 210, height: 220, borderRadius: 110 },
  topicHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10, paddingTop: 4, paddingHorizontal: 4 },
  topicBadge: { width: 32, height: 32, borderRadius: 12, backgroundColor: '#EDF4FE', borderWidth: 1, borderColor: '#DBE8FA', alignItems: 'center', justifyContent: 'center' },
  topicNumber: { color: colors.blue, fontSize: 15, fontWeight: '700' },
  eyebrow: { color: colors.muted, fontSize: 9, lineHeight: 14, letterSpacing: 1.1, fontWeight: '700' },
  topicTitle: { color: colors.ink, fontSize: 15, lineHeight: 21, fontWeight: '700' },
});
