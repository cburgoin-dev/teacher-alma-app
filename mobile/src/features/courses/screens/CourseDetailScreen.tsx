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
import { NavigationIcon } from '../../../components/NavigationIcon';

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
  const labels = { START: 'Comenzar curso', ACCESS: 'Información de acceso', SOON: 'Próximamente', EMPTY: 'Contenido próximamente', ROUTE: course.progress?.status === 'COMPLETED' ? 'Repasar curso' : 'Continuar' };
  return <View style={styles.page}>
    <ScrollView contentContainerStyle={styles.content}>
      <Cover uri={course.coverUrl} level={course.level} hero style={local.hero} />
      <View style={local.intro}>
        <Text style={styles.title}>{course.title}</Text>
        {course.description ? <Text style={local.description}>{course.description}</Text> : null}
      </View>
      {course.content.lessonCount > 0 ? <View style={local.metrics}>
        <View style={local.metric}><NavigationIcon name="CoursesTab" color={colors.muted} size={20} /><Text style={local.metricText}>{course.content.topicCount} {course.content.topicCount === 1 ? 'tema' : 'temas'}</Text></View>
        <View style={local.metric}><View style={local.documentIcon}><View style={local.documentLine} /><View style={local.documentLine} /></View><Text style={local.metricText}>{course.content.lessonCount} lecciones</Text></View>
        {course.level ? <View style={local.metric}><NavigationIcon name="Progress" color={colors.muted} size={19} /><Text style={local.metricText}>{course.level}</Text></View> : null}
      </View> : null}
      {course.progress ? <ProgressBar percentage={course.progress.percentage} /> : null}
      <View style={[local.info, action === 'ACCESS' && local.accessInfo]}>
        <View style={[local.infoIcon, action === 'ACCESS' && { backgroundColor: '#FBE4B6' }]}><NavigationIcon name="CoursesTab" color={action === 'ACCESS' ? colors.gold : colors.blue} size={25} /></View>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={local.infoTitle}>{action === 'SOON' || action === 'EMPTY' ? 'Un nuevo curso está en camino' : 'Tu acceso al curso'}</Text>
          <Text style={local.infoText}>{action === 'SOON' || action === 'EMPTY'
            ? 'El contenido estará disponible próximamente.'
            : course.access.hasFullAccess ? 'Tienes acceso completo a todas las lecciones.'
            : course.content.freeLessonCount > 0 ? `${course.content.freeLessonCount} lecciones gratuitas para explorar.${course.content.freeLessonCount < course.content.lessonCount ? ' El resto requiere acceso al curso o Premium.' : ''}`
            : 'Este curso requiere acceso al curso o una membresía Premium.'}</Text>
        </View>
      </View>
      <View style={local.topics}>
        <Text style={styles.heading}>Temas del curso</Text>
        {roadmap.topics.length ? roadmap.topics.map((topic, index) => <View key={topic.id} style={local.topic}>
          <View style={local.number}><Text style={local.numberText}>{index + 1}</Text></View>
          <Text style={local.topicTitle}>{topic.title}</Text>
          <Text style={local.topicMeta}>{topic.lessons.length}{'\n'}lecc.</Text>
        </View>) : <Text style={styles.body}>Los temas estarán disponibles próximamente.</Text>}
      </View>
      {startError ? <Text accessibilityRole="alert" style={[styles.body, { color: '#B21F36' }]}>{errorMessage(startError)}</Text> : null}
    </ScrollView>
    <View style={local.footer}>
      <View style={local.footerInner}>
        <Button arrow={action === 'START' || action === 'ROUTE'} title={labels[action]} busy={starting} disabled={action === 'SOON' || action === 'EMPTY'} tone={action === 'ACCESS' ? 'gold' : action === 'SOON' || action === 'EMPTY' ? 'gray' : 'red'} onPress={action === 'ACCESS' ? showAccessInfo : action === 'ROUTE' ? () => navigation.navigate('Roadmap', { courseId }) : start} />
      </View>
    </View>
  </View>;
}
const local = StyleSheet.create({
  hero: { width: '100%', aspectRatio: 2, maxHeight: 270, borderRadius: 19 },
  intro: { gap: 7 }, description: { color: colors.muted, fontSize: 17, lineHeight: 24 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, rowGap: 8, paddingVertical: 2 },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  metricText: { fontSize: 13, lineHeight: 19, color: colors.muted, fontWeight: '600' },
  documentIcon: { width: 15, height: 19, borderWidth: 1.8, borderColor: colors.muted, borderRadius: 2, padding: 3, gap: 3, justifyContent: 'center' },
  documentLine: { height: 1.4, backgroundColor: colors.muted },
  info: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 18, padding: 14, gap: 11, backgroundColor: colors.pale, borderWidth: 1, borderColor: colors.border },
  accessInfo: { backgroundColor: '#FFFAF0', borderColor: '#F4E6CC' },
  infoIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#D9EAFF', justifyContent: 'center', alignItems: 'center' },
  infoTitle: { fontSize: 16, lineHeight: 21, color: colors.ink, fontWeight: '700' },
  infoText: { fontSize: 13, lineHeight: 19, color: colors.muted },
  topics: { gap: 10 },
  topic: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingVertical: 11, paddingHorizontal: 12, backgroundColor: '#FCFDFF' },
  number: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: '#9CACCA', alignItems: 'center', justifyContent: 'center' },
  numberText: { color: colors.muted, fontSize: 16, fontWeight: '700' },
  topicTitle: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '600', color: colors.ink },
  topicMeta: { color: colors.muted, fontSize: 10, lineHeight: 13, textAlign: 'center' },
  footer: { paddingHorizontal: 18, paddingVertical: 12, backgroundColor: '#FFF', borderTopWidth: 1, borderColor: '#EDF3FA' },
  footerInner: { width: '100%', maxWidth: 604, alignSelf: 'center' },
});
