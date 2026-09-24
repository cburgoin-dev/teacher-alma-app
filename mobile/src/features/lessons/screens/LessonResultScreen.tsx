import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CoursesStackParamList } from '../../../navigation/types';
import { Button, ProgressBar } from '../../courses/components/ui';
import { showAccessInfo } from '../../courses/components/accessInfo';
import { lessonStyles as s } from '../components/lessonStyles';

export function LessonResultScreen({ route, navigation }: NativeStackScreenProps<CoursesStackParamList, 'LessonResult'>) {
  const { courseId, result: response } = route.params;
  const { result, nextLesson, courseProgress } = response;
  const insets = useSafeAreaInsets();
  const exit = () => navigation.popTo('Roadmap', { courseId });
  const access = nextLesson?.lockReason === 'ACCESS';
  const accessible = nextLesson?.accessible && !access;
  return <ScrollView style={s.page} contentContainerStyle={[s.content, local.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
    <View style={local.hero}>
      <View accessible={false} style={[local.halo, result.isPerfect && { backgroundColor: '#FFF0D0' }]}><View style={local.disc}><View style={local.check} /></View></View>
      <Text style={[s.title, local.center]}>¡Lección completada!</Text>
      <Text style={[s.heading, local.center, { color: '#61759D' }]}>{response.lesson.title}</Text>
    </View>
    {result.totalActivities > 0 ? <View style={local.score}>
      {result.isPerfect ? <Text style={local.success}>¡Excelente trabajo!</Text> : null}
      <Text style={local.scoreNumber}>{result.correctAnswers}<Text style={{ fontSize: 32 }}>/{result.totalActivities}</Text></Text>
      <Text style={s.body}>correctas al primer intento</Text>
    </View> : null}
    <View style={local.progress}><Text style={s.heading}>Progreso del curso</Text><ProgressBar percentage={courseProgress.percentage} /><Text style={s.caption}>{courseProgress.completedLessons} de {courseProgress.totalLessons} lecciones requeridas completadas</Text></View>
    {result.pendingReviewCount > 0 ? <View style={local.review}>
      <Text style={[s.heading, { fontSize: 17 }]}>{result.pendingReviewCount} {result.pendingReviewCount === 1 ? 'ejercicio para reforzar' : 'ejercicios para reforzar'}</Text>
      <Text style={s.caption}>Guardado para repasar más adelante.</Text>
    </View> : result.isPerfect ? <Text style={[s.body, local.success]}>✓ Sin errores para repasar</Text> : null}
    {nextLesson ? <View style={[local.next, access && local.premium]}>
      <Text style={[s.caption, { color: access ? '#84550C' : '#0062E9', fontWeight: '700' }]}>SIGUIENTE LECCIÓN</Text>
      <Text style={s.heading}>{nextLesson.title}</Text>
      {access ? <Text style={[s.caption, { color: '#84550C' }]}>Contenido Premium · Requiere acceso</Text> : null}
      {accessible ? <Button title="Siguiente lección" arrow onPress={() => navigation.replace('Lesson', { courseId, lessonId: nextLesson.id })} />
        : access ? <Button title="Obtener acceso" tone="gold" onPress={showAccessInfo} />
          : <><Text style={s.body}>Completa los pasos anteriores en la ruta.</Text><Button title="Volver a la ruta" onPress={exit} /></>}
    </View> : <><Text style={[s.heading, local.center]}>{courseProgress.status === 'COMPLETED' ? '¡Completaste este curso!' : 'Has llegado al final de la ruta disponible.'}</Text><Button title="Volver a la ruta" onPress={exit} /></>}
    {nextLesson && (access || accessible) ? <Pressable onPress={exit} accessibilityRole="button"><Text style={s.link}>Volver a la ruta</Text></Pressable> : null}
  </ScrollView>;
}
const local = StyleSheet.create({
  content: { gap: 12 }, center: { textAlign: 'center' },
  hero: { alignItems: 'center', gap: 6 },
  halo: { width: 82, height: 82, borderRadius: 41, backgroundColor: '#DCF3E8', padding: 9, marginBottom: 5 },
  disc: { flex: 1, borderRadius: 40, backgroundColor: '#14995B', alignItems: 'center', justifyContent: 'center' },
  check: { width: 29, height: 17, borderLeftWidth: 5, borderBottomWidth: 5, borderColor: '#FFF', transform: [{ rotate: '-45deg' }], marginTop: -5 },
  score: { alignItems: 'center', paddingVertical: 12, borderRadius: 18, backgroundColor: '#EFF6FF' },
  scoreNumber: { fontSize: 46, lineHeight: 54, fontWeight: '800', color: '#0062E9' },
  success: { color: '#13874C', textAlign: 'center', fontWeight: '600' },
  progress: { gap: 4, paddingHorizontal: 4, paddingVertical: 5 },
  review: { padding: 13, gap: 3, backgroundColor: '#FFF1F3', borderRadius: 16 },
  next: { padding: 14, gap: 8, borderRadius: 18, backgroundColor: '#F4F8FE', borderColor: '#DFEAF8', borderWidth: 1 },
  premium: { backgroundColor: '#FFFAEE', borderColor: '#F1D99B' },
});
