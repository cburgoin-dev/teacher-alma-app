import { useCallback } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CoursesStackParamList } from '../../../navigation/types';
import { coursesApi } from '../api/courses';
import { useCourseResource } from '../hooks/useCourseResource';
import { lessonLabels, lessonState } from '../presentation';
import { Button, colors, ProgressBar, ResourceState, styles } from '../components/ui';
import { showAccessInfo } from '../components/accessInfo';
import type { Lesson } from '../types';
import { NavigationIcon } from '../../../components/NavigationIcon';

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
  return <ScrollView style={styles.page} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={resource.loading} onRefresh={resource.retry} tintColor={colors.blue} />}>
    <View style={local.summary}><Text style={local.courseChip}>{roadmap.course.title}</Text><ProgressBar percentage={roadmap.progress.percentage} /><Text style={local.summaryText}>{roadmap.progress.completedLessons} de {roadmap.progress.totalLessons} lecciones completadas</Text></View>
    {roadmap.progress.totalLessons > 0 && roadmap.progress.completedLessons === roadmap.progress.totalLessons ? <Text style={local.complete}>¡Curso completado! Tu ruta sigue aquí para repasar.</Text> : null}
    {!roadmap.topics.length ? <ResourceState empty="La ruta de este curso estará disponible próximamente." /> : roadmap.topics.map((topic, topicIndex) => <View key={topic.id}>
      <View style={local.topicHeader}><Text style={local.topicNumber}>TEMA {topicIndex + 1}</Text><Text style={styles.heading}>{topic.title}</Text></View>
      {topic.lessons.map((lesson, lessonIndex) => {
        const index = globalIndex++;
        const state = lessonState(lesson);
        const current = state === 'CURRENT';
        const locked = state === 'LOCKED_ACCESS' || state === 'LOCKED_PREREQUISITE';
        const tone = state === 'LOCKED_ACCESS' ? '#EAAF3C' : state === 'LOCKED_PREREQUISITE' ? colors.gray : current ? colors.red : colors.blue;
        const offset = [0, 22, 10, 30][index % 4];
        return <View key={lesson.id} style={[local.stop, { paddingLeft: offset }]}>
          <View style={local.nodeColumn}>
            {lessonIndex < topic.lessons.length - 1 ? <View pointerEvents="none" style={[local.connector, { transform: [{ rotate: index % 2 ? '12deg' : '-12deg' }] }]} /> : null}
            <Pressable accessibilityRole="button" accessibilityLabel={lesson.title + '. ' + lessonLabels[state] + (lesson.progressStatus === 'COMPLETED' && locked ? '. Completada' : '')} onPress={() => openLesson(lesson)} style={({ pressed }) => [local.halo, { backgroundColor: current ? '#FFE4E8' : locked ? '#E9EFF6' : '#E1EFFF', opacity: pressed ? .7 : 1 }]}>
              <View style={[local.node, { backgroundColor: tone }]}>{locked ? <View><View style={local.shackle} /><View style={local.lockBody}><View style={local.keyhole} /></View></View> : current ? <NavigationIcon name="CoursesTab" color="#FFF" size={32} /> : <Text style={local.symbol}>{state === 'COMPLETED' ? '✓' : '›'}</Text>}</View>
            </Pressable>
          </View>
          <View style={[local.lessonText, current && local.currentCard]}><Text style={local.lessonTitle}>{index + 1}. {lesson.title}</Text><Text style={local.lessonMeta}>{lessonLabels[state]}</Text>
            {locked && lesson.progressStatus === 'COMPLETED' ? <Text style={local.lessonMeta}>Completada</Text> : null}
            {current ? <Button title="Continuar  →" onPress={() => openLesson(lesson)} /> : null}
            {lesson.progression.isCurrent && state === 'LOCKED_ACCESS' ? <><Text style={local.lessonMeta}>Tu siguiente lección</Text><Button title="Ver acceso" tone="gold" onPress={showAccessInfo} /></> : null}
          </View>
        </View>;
      })}
    </View>)}
  </ScrollView>;
}
const local = StyleSheet.create({
  summary: { gap: 12 }, courseChip: { alignSelf: 'flex-start', paddingHorizontal: 13, paddingVertical: 7, borderRadius: 18, backgroundColor: '#E4F0FF', color: colors.blue, fontWeight: '700', fontSize: 15 },
  summaryText: { color: colors.muted, fontSize: 13 }, complete: { color: colors.blue, backgroundColor: colors.pale, padding: 16, borderRadius: 18, fontSize: 16 },
  topicHeader: { gap: 5, marginTop: 10, marginBottom: 22 }, topicNumber: { color: colors.muted, fontSize: 11, letterSpacing: 1.5, fontWeight: '700' },
  stop: { flexDirection: 'row', alignItems: 'center', minHeight: 146, gap: 12, paddingBottom: 24 }, nodeColumn: { alignSelf: 'stretch', width: 84, justifyContent: 'center', alignItems: 'center' },
  connector: { position: 'absolute', top: '50%', height: '150%', borderLeftWidth: 3, borderStyle: 'dashed', borderColor: '#A4B8D3' },
  halo: { width: 84, height: 84, padding: 6, borderRadius: 42, elevation: 2, shadowColor: '#476B9F', shadowOffset: { width: 0, height: 3 }, shadowOpacity: .12, shadowRadius: 6 },
  node: { flex: 1, borderRadius: 38, borderWidth: 2, borderColor: '#FFFFFF80', alignItems: 'center', justifyContent: 'center' },
  symbol: { color: '#FFF', fontSize: 37, fontWeight: '800' }, lessonText: { flex: 1, gap: 6 }, lessonTitle: { color: colors.ink, fontSize: 17, lineHeight: 23, fontWeight: '700' }, lessonMeta: { fontSize: 13, lineHeight: 18, color: colors.muted },
  currentCard: { borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#FFE0E7', padding: 12, gap: 10 },
  shackle: { width: 16, height: 15, borderWidth: 3, borderColor: '#FFF', borderTopLeftRadius: 10, borderTopRightRadius: 10, alignSelf: 'center', marginBottom: -3 },
  lockBody: { width: 25, height: 22, backgroundColor: '#FFF', borderRadius: 4, alignItems: 'center', justifyContent: 'center' }, keyhole: { width: 4, height: 8, borderRadius: 3, backgroundColor: colors.gray },
});
