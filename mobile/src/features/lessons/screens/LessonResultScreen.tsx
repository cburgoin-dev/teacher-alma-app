import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CoursesStackParamList } from '../../../navigation/types';
import { Button } from '../../courses/components/ui';
import { showAccessInfo } from '../../courses/components/accessInfo';
import { lessonStyles as s } from '../components/lessonStyles';
import { LearningIcon } from '../components/LearningIcon';
import { accuracy, courseLabel } from '../contentPresentation';

function CompletionHero({ perfect }: { perfect: boolean }) {
  return <View accessible={false} pointerEvents="none" style={local.art}>
    <Svg width="100%" height="100%" viewBox="0 0 260 150">
      <Circle cx="130" cy="75" r="69" fill={perfect ? '#FFF3D8' : '#EBF4FF'} />
      <Path d="M37 33c13-9 6 20 22 13M204 63c17 4 4-22 20-19" stroke="#FF3554" strokeWidth="6" fill="none" strokeLinecap="round" />
      <Path d="m72 16 9 13m111 88 10 10M35 109c-1-14 12-8 15-16" stroke="#1680FF" strokeWidth="6" fill="none" strokeLinecap="round" />
      <Path d="m181 16-11 15m42 74 9 4" stroke="#FFBE2A" strokeWidth="7" strokeLinecap="round" />
      <Rect x="31" y="67" width="12" height="6" rx="1" fill="#FFBE2A" transform="rotate(15 37 70)" />
      <Circle cx="130" cy="76" r="49" fill="#49DA93" />
      <Circle cx="130" cy="76" r="43" fill="#0BA65D" />
      <Path d="m109 77 14 14 29-31" stroke="#FFF" strokeWidth="11" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  </View>;
}
export function LessonResultScreen({ route, navigation }: NativeStackScreenProps<CoursesStackParamList, 'LessonResult'>) {
  const { courseId, result: response } = route.params;
  const insets = useSafeAreaInsets();
  const exit = () => navigation.popTo('Roadmap', { courseId });
  if (response.mode === 'REPLAY') return <ScrollView style={s.page} contentContainerStyle={[s.content, local.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
    <View style={local.hero}><CompletionHero perfect={response.result.isPerfect} /><Text style={[s.title, local.center]}>¡Repaso completado!</Text></View>
    <View style={local.identity}>
      <Text style={[s.caption, local.courseTitle, local.center]}>{courseLabel(response.course)} · Repaso</Text>
      <Text style={[s.heading, local.center]}>{response.lesson.title}</Text>
    </View>
    {response.result.totalActivities > 0 ? <View style={local.score}>
      <Text style={[s.caption, local.courseTitle]}>PRECISIÓN</Text>
      <Text style={local.scoreNumber}>{accuracy(response.result.correctAnswers, response.result.totalActivities)}%</Text>
      <Text style={[s.body, local.center]}>{response.result.correctAnswers} de {response.result.totalActivities} correctas al primer intento</Text>
      <Text style={[s.caption, local.center]}>Basado en tu primer intento de esta repetición.</Text>
    </View> : null}
    <Button title="Continuar mi ruta" arrow onPress={exit} />
  </ScrollView>;
  const { result, nextLesson, courseProgress, course } = response;
  const access = nextLesson?.lockReason === 'ACCESS';
  const accessible = nextLesson?.accessible && !access;
  return <ScrollView style={s.page} contentContainerStyle={[s.content, local.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
    <View style={local.hero}>
      <CompletionHero perfect={result.isPerfect} />
      <Text style={[s.title, local.center]}>{result.isPerfect ? '¡Excelente trabajo!' : '¡Lección completada!'}</Text>
      {result.isPerfect ? <Text style={[s.body, local.center]}>Has completado la lección con éxito.</Text> : null}
    </View>
    <View style={local.identity}>

      <Text style={[s.heading, local.center, { fontSize: 22, lineHeight: 29 }]}>{response.lesson.title}</Text>
    </View>
    {result.totalActivities > 0 ? <View style={[local.score, result.isPerfect && local.positive]}>
      <Text style={[s.caption, local.courseTitle]}>PRECISIÓN</Text>
      <Text style={local.scoreNumber}>{accuracy(result.correctAnswers, result.totalActivities)}%</Text>
      <Text style={[s.body, local.center]}>{result.correctAnswers} de {result.totalActivities} correctas al primer intento</Text>
    </View> : null}
    <View style={local.progress}>
      <View style={local.progressHeading}><Text style={[s.heading, { flex: 1 }]}>Progreso del curso</Text><Text style={[s.heading, local.courseTitle]}>{Math.round(courseProgress.percentage)}%</Text></View>
      <View style={local.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: courseProgress.percentage }} accessibilityLabel="Progreso de lecciones obligatorias">
        <View style={[local.fill, { width: `${Math.max(0, Math.min(100, courseProgress.percentage))}%` }]} />
      </View>
      {courseLabel(course) ? <Text style={s.chip}>{courseLabel(course)}</Text> : null}
      <Text style={s.caption}>{courseProgress.completedLessons} de {courseProgress.totalLessons} lecciones completadas</Text>
    </View>
    {result.pendingReviewCount > 0 ? <View style={local.review}>
      <LearningIcon kind="pencil" rose /><View style={{ flex: 1 }}>
        <Text style={s.heading}>{result.pendingReviewCount} {result.pendingReviewCount === 1 ? 'ejercicio para reforzar' : 'ejercicios para reforzar'}</Text>
        <Text style={s.caption}>Guardado para repasar más adelante.</Text>
      </View>
    </View> : result.isPerfect ? <View style={[local.review, local.positive]}>
      <LearningIcon kind="completion" /><Text style={[s.heading, { flex: 1, color: '#13874C' }]}>¡Sin errores para repasar!</Text>
    </View> : null}
    {nextLesson ? <View style={[local.next, access && local.premium]}>
      <Text style={[s.caption, { color: access ? '#84550C' : '#0062E9', fontWeight: '700' }]}>SIGUIENTE LECCIÓN</Text>
      <Text style={s.heading}>{nextLesson.title}</Text>
      {access ? <Text style={[s.body, { color: '#84550C' }]}>Contenido Premium · Requiere acceso</Text> : null}
      {accessible ? <Button title="Siguiente lección" arrow onPress={() => navigation.replace('Lesson', { courseId, lessonId: nextLesson.id })} />
        : access ? <Button title="Obtener acceso" tone="gold" onPress={showAccessInfo} />
          : <Text style={s.body}>Completa los pasos anteriores en la ruta.</Text>}
    </View> : <Text style={[s.heading, local.center]}>{courseProgress.status === 'COMPLETED' ? '¡Completaste este curso!' : 'Has llegado al final de la ruta disponible.'}</Text>}
    <Button title="Volver a la ruta" tone="blue" onPress={exit} />
  </ScrollView>;
}
const local = StyleSheet.create({
  content: { gap: 14 }, center: { textAlign: 'center' },
  hero: { alignItems: 'center', gap: 8 }, art: { width: 260, maxWidth: '100%', height: 150 },
  identity: { gap: 8, paddingHorizontal: 10, paddingVertical: 4 },
  progressHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  track: { height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: '#DEE8F5' },
  fill: { height: '100%', borderRadius: 6, backgroundColor: '#0878F8' },
  courseTitle: { color: '#0062E9', fontWeight: '700', flexShrink: 1 },
  score: { alignItems: 'center', padding: 14, borderRadius: 18, borderWidth: 1, borderColor: '#DEEAFA', backgroundColor: '#EFF6FF' },
  scoreNumber: { fontSize: 46, lineHeight: 54, fontWeight: '800', color: '#0062E9' },
  positive: { backgroundColor: '#EFFAF5', borderColor: '#D8F2E5' },
  progress: { gap: 8, padding: 16, borderWidth: 1, borderColor: '#DEEAFA', borderRadius: 18, backgroundColor: '#FCFDFF' },
  review: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, backgroundColor: '#FFF3F5', borderWidth: 1, borderColor: '#FFE0E7', borderRadius: 18 },
  next: { padding: 16, gap: 10, borderRadius: 18, backgroundColor: '#F6F9FE', borderColor: '#DFEAF8', borderWidth: 1 },
  premium: { backgroundColor: '#FFFAEE', borderColor: '#F1D99B' },
});
