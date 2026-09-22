import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CoursesStackParamList } from '../../../navigation/types';
import { coursesApi } from '../api/courses';
import { useCourseResource } from '../hooks/useCourseResource';
import { detailAction } from '../presentation';
import { showAccessInfo } from '../components/accessInfo';
import { Button, colors, Cover, errorMessage, ProgressBar, ResourceState, styles } from '../components/ui';

export function CourseDetailScreen({ route, navigation }: NativeStackScreenProps<CoursesStackParamList, 'CourseDetail'>) {
  const { courseId } = route.params;
  const resource = useCourseResource(useCallback(async (signal: AbortSignal) => {
    const [course, roadmap] = await Promise.all([coursesApi.detail(courseId, signal), coursesApi.roadmap(courseId, signal)]);
    return { course, roadmap };
  }, [courseId]));
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<unknown>(null);
  const request = useRef<AbortController | null>(null);
  useFocusEffect(useCallback(() => {
    setStarting(false); setStartError(null);
    return () => { request.current?.abort(); request.current = null; };
  }, [courseId]));
  if (resource.loading || resource.error || !resource.data) return <View style={styles.page}><ResourceState loading={resource.loading} error={resource.error} retry={resource.retry} /></View>;
  const { course, roadmap } = resource.data;
  const action = detailAction(course, roadmap);
  const start = async () => {
    if (request.current || action !== 'START') return;
    const controller = new AbortController(); request.current = controller;
    setStarting(true); setStartError(null);
    try {
      await coursesApi.start(courseId, controller.signal);
      if (!controller.signal.aborted) navigation.replace('Roadmap', { courseId });
    } catch (error) { if (!controller.signal.aborted) setStartError(error); }
    finally { if (request.current === controller) { request.current = null; setStarting(false); } }
  };
  const labels = { START: 'Comenzar curso  →', ACCESS: 'Información de acceso', SOON: 'Próximamente', EMPTY: 'Contenido próximamente', ROUTE: course.progress?.status === 'COMPLETED' ? 'Repasar curso  →' : 'Continuar  →' };
  return <ScrollView style={styles.page} contentContainerStyle={styles.content}>
    <Cover uri={course.coverUrl} level={course.level} style={local.hero} />
    <View style={{ gap: 8 }}><Text style={styles.title}>{course.title}</Text>{course.description ? <Text style={[styles.body, { fontSize: 19, lineHeight: 27 }]}>{course.description}</Text> : null}</View>
    <View style={local.metrics}><Text style={local.metric}>{course.content.topicCount} temas</Text><Text style={local.metric}>{course.content.lessonCount} lecciones</Text>{course.level ? <Text style={local.metric}>Nivel {course.level}</Text> : null}</View>
    {course.progress ? <ProgressBar percentage={course.progress.percentage} /> : null}
    <View style={local.info}><Text style={styles.heading}>Tu acceso al curso</Text><Text style={styles.body}>{course.content.freeLessonCount} de {course.content.lessonCount} lecciones gratuitas.</Text><Text style={styles.body}>{course.access.hasFullAccess ? 'Tienes acceso completo a este curso.' : 'El contenido de pago requiere acceso al curso o Premium.'}</Text></View>
    <Text style={styles.heading}>Temas del curso</Text>
    {roadmap.topics.length ? roadmap.topics.map((topic, index) => <View key={topic.id} style={local.topic}><View style={local.number}><Text style={local.numberText}>{index + 1}</Text></View><View style={{ flex: 1, gap: 4 }}><Text style={local.topicTitle}>{topic.title}</Text><Text style={local.topicMeta}>{topic.lessons.length} lecciones</Text></View></View>) : <Text style={styles.body}>Los temas estarán disponibles próximamente.</Text>}
    {startError ? <Text accessibilityRole="alert" style={[styles.body, { color: '#B21F36' }]}>{errorMessage(startError)}</Text> : null}
    <Button title={labels[action]} busy={starting} disabled={action === 'SOON' || action === 'EMPTY'} tone={action === 'ACCESS' ? 'gold' : action === 'SOON' || action === 'EMPTY' ? 'gray' : 'red'} onPress={action === 'ACCESS' ? showAccessInfo : action === 'ROUTE' ? () => navigation.navigate('Roadmap', { courseId }) : start} />
  </ScrollView>;
}
const local = StyleSheet.create({
  hero: { height: 190, borderRadius: 20 }, metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 }, metric: { fontSize: 15, color: colors.muted, fontWeight: '600' },
  info: { borderRadius: 20, padding: 18, gap: 9, backgroundColor: colors.pale, borderWidth: 1, borderColor: colors.border },
  topic: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 14 },
  number: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: '#9BABCA', alignItems: 'center', justifyContent: 'center' },
  numberText: { color: colors.muted, fontSize: 18, fontWeight: '700' }, topicTitle: { fontSize: 16, fontWeight: '600', color: colors.ink }, topicMeta: { color: colors.muted, fontSize: 13 },
});
