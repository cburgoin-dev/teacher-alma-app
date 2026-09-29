import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CoursesStackParamList } from '../../../navigation/types';
import { Button } from '../../courses/components/ui';
import { lessonStyles as s } from '../components/lessonStyles';
import { LearningIcon } from '../components/LearningIcon';
import { accuracy, courseLabel } from '../contentPresentation';

export function CompletionHero({ perfect }: { perfect: boolean }) {
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
    <Button title="Continuar en la ruta" arrow onPress={exit} />
  </ScrollView>;
  const { result, nextNode, courseProgress, course } = response;
  const access = nextNode?.lockReason === 'ACCESS';
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
      <View style={local.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: courseProgress.percentage }} accessibilityLabel="Progreso de pasos obligatorios">
        <View style={[local.fill, { width: `${Math.max(0, Math.min(100, courseProgress.percentage))}%` }]} />
      </View>
      <View style={local.courseMetadata}>
        {courseLabel(course) ? <Text style={s.chip}>{courseLabel(course)}</Text> : null}
        <Text accessibilityLabel={`${courseProgress.completedRequiredNodes} de ${courseProgress.totalRequiredNodes} pasos completados`} style={s.caption}>{courseProgress.completedRequiredNodes} de {courseProgress.totalRequiredNodes}</Text>
      </View>
    </View>
    {result.pendingReviewCount > 0 ? <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${result.pendingReviewCount} ${result.pendingReviewCount === 1 ? 'ejercicio' : 'ejercicios'} para repasar. De esta lección`}
      accessibilityHint="Abre el repaso de ejercicios pendientes"
      onPress={() => navigation.navigate('Review', { courseId, preferredLessonId: response.lesson.id })}
      style={({ pressed }) => [local.reviewPending, pressed && local.reviewPressed]}>
        <View style={local.reviewBadge}><LearningIcon kind="pencil" plain color="#D72E50" size={27} /></View>
        <View style={{ flex: 1, gap: 3 }}><Text style={local.reviewTitle}>{result.pendingReviewCount} {result.pendingReviewCount === 1 ? 'ejercicio para repasar' : 'ejercicios para repasar'}</Text><Text style={local.reviewCaption}>De esta lección</Text></View>
        <View accessible={false} importantForAccessibility="no-hide-descendants"><ChevronRight size={21} color="#65789D" strokeWidth={2} /></View>
    </Pressable> : result.isPerfect ? <View style={[local.review, local.positive]}>
      <LearningIcon kind="completion" /><Text style={[s.heading, { flex: 1, color: '#13874C' }]}>¡Sin errores para repasar!</Text>
    </View> : null}
    {nextNode ? <View style={[local.next, access && local.premium]}>
      <Text style={[s.caption, { color: access ? '#84550C' : '#0062E9', fontWeight: '700' }]}>SIGUIENTE PASO</Text>
      <Text style={s.heading}>{nextNode.title}</Text>
      {access ? <Text style={[s.body, { color: '#84550C' }]}>Contenido Premium · Requiere acceso</Text> : null}
      {nextNode.lockReason === 'PREREQUISITE' ? <Text style={s.body}>Completa los pasos anteriores en la ruta.</Text> : null}
    </View> : <Text style={[s.heading, local.center]}>{courseProgress.status === 'COMPLETED' ? '¡Completaste este curso!' : 'Has llegado al final de la ruta disponible.'}</Text>}
    <Button title="Continuar en la ruta" arrow onPress={exit} />
  </ScrollView>;
}
const local = StyleSheet.create({
  content: { gap: 14 }, center: { textAlign: 'center' },
  hero: { alignItems: 'center', gap: 8 }, art: { width: 260, maxWidth: '100%', height: 150 },
  identity: { gap: 8, paddingHorizontal: 10, paddingVertical: 4 },
  courseMetadata: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 12, rowGap: 8 },
  progressHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  track: { height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: '#DEE8F5' },
  fill: { height: '100%', borderRadius: 6, backgroundColor: '#0878F8' },
  courseTitle: { color: '#0062E9', fontWeight: '700', flexShrink: 1 },
  score: { alignItems: 'center', padding: 14, borderRadius: 18, borderWidth: 1, borderColor: '#DEEAFA', backgroundColor: '#EFF6FF' },
  scoreNumber: { fontSize: 46, lineHeight: 54, fontWeight: '800', color: '#0062E9' },
  positive: { backgroundColor: '#EFFAF5', borderColor: '#D8F2E5' },
  progress: { gap: 8, padding: 16, borderWidth: 1, borderColor: '#DEEAFA', borderRadius: 18, backgroundColor: '#FCFDFF' },
  review: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, backgroundColor: '#FFF3F5', borderWidth: 1, borderColor: '#FFE0E7', borderRadius: 18 },
  reviewPending: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, minHeight: 80, backgroundColor: '#FFF7F8', borderColor: '#FFE3E9', borderWidth: 1, borderRadius: 18 },
  reviewPressed: { backgroundColor: '#FFEAF0', borderColor: '#F5C8D3' },
  reviewBadge: { minWidth: 46, minHeight: 46, padding: 8, borderRadius: 23, backgroundColor: '#FFE4EA', alignItems: 'center', justifyContent: 'center' },
  reviewTitle: { color: '#C62849', fontSize: 17, lineHeight: 23, fontWeight: '700' },
  reviewCaption: { color: '#65789D', fontSize: 14, lineHeight: 20 },
  next: { padding: 16, gap: 10, borderRadius: 18, backgroundColor: '#F6F9FE', borderColor: '#DFEAF8', borderWidth: 1 },
  premium: { backgroundColor: '#FFFAEE', borderColor: '#F1D99B' },
});
