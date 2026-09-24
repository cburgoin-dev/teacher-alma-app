import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
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
import { initialRoadmapOffset, roadmapTarget } from '../roadmapPosition';

function openLesson(lesson: Lesson, enter: () => void) {
  const state = lessonState(lesson);
  if (state === 'LOCKED_PREREQUISITE') Alert.alert('Una lección a la vez', 'Completa primero la lección anterior de la ruta para desbloquear esta lección.');
  else if (state === 'LOCKED_ACCESS') showAccessInfo();
  else enter();
}
export function RoadmapScreen({ route, navigation }: NativeStackScreenProps<CoursesStackParamList, 'Roadmap'>) {
  const resource = useCourseResource(useCallback((signal: AbortSignal) => coursesApi.roadmap(route.params.courseId, signal), [route.params.courseId]));
  const scroll = useRef<ScrollView>(null);
  const positioned = useRef(false);
  const latestData = useRef(resource.data);
  latestData.current = resource.data;
  const entryData = useRef(resource.data);
  const focused = useIsFocused();
  const [viewport, setViewport] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [mapY, setMapY] = useState<number | null>(null);
  const [anchor, setAnchor] = useState<{ id: string; y: number } | null>(null);
  const target = resource.data ? roadmapTarget(resource.data) : null;
  useFocusEffect(useCallback(() => {
    positioned.current = false;
    entryData.current = latestData.current;
  }, [route.params.courseId]));
  const onTargetLayout = useCallback((id: string, y: number) => setAnchor(previous => previous?.id === id && previous.y === y ? previous : { id, y }), []);
  useEffect(() => {
    // Wait for the focus reload (Result may have changed CURRENT) and measured path content.
    if (!focused || resource.loading || resource.error || resource.data === entryData.current || positioned.current || !target || anchor?.id !== target || mapY === null || !viewport || contentHeight < mapY + anchor.y) return;
    const frame = requestAnimationFrame(() => {
      if (positioned.current) return;
      positioned.current = true;
      scroll.current?.scrollTo({ y: initialRoadmapOffset(anchor.y, mapY, viewport, contentHeight), animated: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [focused, resource.loading, resource.error, resource.data, target, anchor, mapY, viewport, contentHeight]);
  if ((!resource.data && resource.loading) || resource.error || !resource.data) return <View style={styles.page}><ResourceState loading={resource.loading} error={resource.error} retry={resource.retry} /></View>;
  const roadmap = resource.data;

  return <ScrollView ref={scroll} onLayout={e => setViewport(e.nativeEvent.layout.height)} onContentSizeChange={(_, height) => setContentHeight(height)}
    onTouchStart={() => { positioned.current = true; }}
    onScrollBeginDrag={() => { positioned.current = true; }} style={[styles.page, { backgroundColor: '#F1F8FD' }]} contentContainerStyle={local.content}
    refreshControl={<RefreshControl refreshing={resource.loading} onRefresh={resource.retry} tintColor={colors.blue} />}>
    <View style={local.summary}>
      <Text style={local.courseChip}>{roadmap.course.title}</Text>
      <ProgressBar percentage={roadmap.progress.percentage} />
      <Text style={local.summaryText}>{roadmap.progress.completedLessons} de {roadmap.progress.totalLessons} lecciones completadas</Text>
    </View>
    {roadmap.progress.totalLessons > 0 && roadmap.progress.completedLessons === roadmap.progress.totalLessons
      ? <Text style={local.complete}>¡Curso completado! Tu ruta sigue aquí para repasar.</Text> : null}
    {!roadmap.topics.length ? <ResourceState empty="La ruta de este curso estará disponible próximamente." /> : <View style={local.map} onLayout={e => setMapY(e.nativeEvent.layout.y)}><CoursePath topics={roadmap.topics} targetId={target} onTargetLayout={onTargetLayout} onLessonPress={lesson => openLesson(lesson, () => navigation.navigate('Lesson', { courseId: route.params.courseId, lessonId: lesson.id }))} /></View>}
  </ScrollView>;
}
const local = StyleSheet.create({
  content: { paddingTop: 6, paddingBottom: 16, width: '100%', maxWidth: 640, alignSelf: 'center' },
  summary: { paddingHorizontal: 20, gap: 5, paddingBottom: 8 },
  courseChip: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 3, borderRadius: 16, backgroundColor: '#E3F0FF', color: colors.blue, fontWeight: '700', fontSize: 13, lineHeight: 18 },
  summaryText: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  complete: { color: colors.blue, backgroundColor: colors.pale, padding: 14, borderRadius: 18, fontSize: 15, marginHorizontal: 20, marginBottom: 14 },
  map: { paddingHorizontal: 18 },
});
