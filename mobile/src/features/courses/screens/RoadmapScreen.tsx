import { beginCompletion, consumeCompletion, type ProgressTransition } from '../completionMotion';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CoursesStackParamList } from '../../../navigation/types';
import { coursesApi } from '../api/courses';
import { useCourseResource } from '../hooks/useCourseResource';
import { lessonState } from '../presentation';
import { colors, ProgressBar, ResourceState, styles } from '../components/ui';
import { showAccessInfo } from '../components/accessInfo';
import { CoursePath } from '../components/CoursePath';
import type { Lesson } from '../types';
import { initialRoadmapOffset, motionViewportOffset, roadmapTarget } from '../roadmapPosition';

function openLesson(lesson: Lesson, enter: () => void) {
  const state = lessonState(lesson);
  if (state === 'LOCKED_PREREQUISITE') Alert.alert('Continúa en orden', 'Completa los pasos anteriores de la ruta, incluido el reto de unidad cuando corresponda.');
  else if (state === 'LOCKED_ACCESS') showAccessInfo();
  else enter();
}
export function RoadmapScreen({ route, navigation }: NativeStackScreenProps<CoursesStackParamList, 'Roadmap'>) {
  const resource = useCourseResource(useCallback((signal: AbortSignal) => coursesApi.roadmap(route.params.courseId, signal), [route.params.courseId]));
  const scroll = useRef<ScrollView>(null);
  const [transition, setTransition] = useState<ProgressTransition | null>(null);
  const [motionReady, setMotionReady] = useState(false);
  const checked = useRef(false);
  const navigating = useRef(false);
  const onMotionEnd = useCallback(() => setTransition(null), []);
  const positioned = useRef(false);
  const latestData = useRef(resource.data);
  latestData.current = resource.data;
  const entryData = useRef(resource.data);
  const focused = useIsFocused();
  const [viewport, setViewport] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [mapY, setMapY] = useState<number | null>(null);
  const [anchor, setAnchor] = useState<{ id: string; y: number; range?: { top: number; bottom: number } } | null>(null);
  const target = resource.data ? roadmapTarget(resource.data) : null;
  useFocusEffect(useCallback(() => {
    positioned.current = false;
    checked.current = false;
    navigating.current = false;
    setTransition(null);
    setMotionReady(false);
    entryData.current = latestData.current;
  }, [route.params.courseId]));
  useLayoutEffect(() => {
    if (!focused || resource.loading || resource.error || !resource.data || resource.data === entryData.current || checked.current) return;
    checked.current = true;
    const next = consumeCompletion(route.params.completionTicket, resource.data);
    if (next) positioned.current = false;
    setTransition(next);
  }, [focused, resource.loading, resource.error, resource.data, route.params.completionTicket]);
  const onMotionPosition = useCallback((y: number) => {
    if (focused && mapY !== null && viewport > 0) scroll.current?.scrollTo({ y: motionViewportOffset(y, mapY, viewport, contentHeight), animated: false });
  }, [focused, mapY, viewport, contentHeight]);
  const onTargetLayout = useCallback((id: string, y: number, range?: { top: number; bottom: number }) => setAnchor(previous => previous?.id === id && previous.y === y && previous.range?.top === range?.top && previous.range?.bottom === range?.bottom ? previous : { id, y, range }), []);
  useEffect(() => {
    // Wait for the focus reload (Result may have changed CURRENT) and measured path content.
    if (!checked.current || !focused || resource.loading || resource.error || resource.data === entryData.current || positioned.current || !target || anchor?.id !== target + ':' + (transition?.from ?? '') || mapY === null || !viewport || contentHeight < mapY + anchor.y) return;
    const frame = requestAnimationFrame(() => {
      if (positioned.current) return;
      const offset = transition && anchor.range
        ? motionViewportOffset(anchor.y, mapY, viewport, contentHeight)
        : initialRoadmapOffset(anchor.y, mapY, viewport, contentHeight);
      positioned.current = true;
      scroll.current?.scrollTo({ y: offset, animated: !transition });
      setMotionReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [focused, resource.loading, resource.error, resource.data, target, anchor, mapY, viewport, contentHeight, transition]);
  if ((!resource.data && resource.loading) || resource.error || !resource.data) return <View style={styles.page}><ResourceState loading={resource.loading} error={resource.error} retry={resource.retry} /></View>;
  const roadmap = resource.data;

  return <ScrollView ref={scroll} scrollEnabled={!transition} onLayout={e => setViewport(e.nativeEvent.layout.height)} onContentSizeChange={(_, height) => setContentHeight(height)}
    onTouchStart={() => { if (!transition) positioned.current = true; }}
    onScrollBeginDrag={() => { positioned.current = true; }} style={[styles.page, { backgroundColor: '#F1F8FD' }]} contentContainerStyle={local.content}
    refreshControl={<RefreshControl refreshing={resource.loading} onRefresh={() => { if (!transition) resource.retry(); }} tintColor={colors.blue} />}>
    <View style={local.summary}>
      {__DEV__ ? <Pressable accessibilityRole="button" accessibilityLabel="DEV: repetir transición de ruta" disabled={!!transition || resource.loading} onPress={() => {
        const replay = (require('../devMotion') as typeof import('../devMotion')).devReplayTransition(roadmap);
        if (!replay) { Alert.alert('DEV motion', 'Completa un paso para disponer de un tramo anterior al nodo actual.'); return; }
        positioned.current = false;
        setMotionReady(false);
        setTransition(replay);
      }} style={({ pressed }) => ({ alignSelf: 'flex-end', padding: 8, opacity: pressed || transition ? .5 : 1 })}><Text style={{ fontSize: 11, color: colors.muted }}>DEV · Replay motion · 1×</Text></Pressable> : null}
      <Text style={local.courseChip}>{roadmap.course.title}</Text>
      <ProgressBar percentage={roadmap.progress.percentage} />
      <Text style={local.summaryText}>{roadmap.progress.completedRequiredNodes} de {roadmap.progress.totalRequiredNodes} pasos completados</Text>
    </View>
    {roadmap.progress.totalRequiredNodes > 0 && roadmap.progress.completedRequiredNodes === roadmap.progress.totalRequiredNodes
      ? <Text style={local.complete}>¡Curso completado! Tu ruta sigue aquí para repasar.</Text> : null}
    {!roadmap.topics.length ? <ResourceState empty="La ruta de este curso estará disponible próximamente." /> : <View style={local.map} onLayout={e => setMapY(e.nativeEvent.layout.y)}><CoursePath transition={focused ? transition : null} motionReady={focused && motionReady} onMotionEnd={onMotionEnd} onMotionPosition={onMotionPosition} topics={roadmap.topics} currentNodeId={roadmap.currentNode?.id} targetId={target} onTargetLayout={onTargetLayout} onLessonPress={lesson => {
      if (transition || resource.loading || !checked.current || navigating.current) return;
      openLesson(lesson, () => {
        navigating.current = true;
        const completionTicket = beginCompletion(roadmap, lesson);
        if (lesson.type === 'UNIT_CHALLENGE') navigation.navigate('UnitChallenge', { courseId: route.params.courseId, unitChallengeId: lesson.id, completionTicket });
        else navigation.navigate('Lesson', { courseId: route.params.courseId, lessonId: lesson.id, completionTicket });
      });
    }} /></View>}
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
