import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { ActivityIndicator, BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CoursesStackParamList } from '../../../navigation/types';
import { ApiError } from '../../../services/api/client';
import { Button, ProgressBar } from '../../courses/components/ui';
import { showAccessInfo } from '../../courses/components/accessInfo';
import { LessonFlow } from '../flow';
import { lessonError } from '../presentation';
import { ContentBlocks } from '../components/ContentBlocks';
import { ActivityStep } from '../components/ActivityStep';
import { LearningIcon } from '../components/LearningIcon';
import { lessonStyles as s } from '../components/lessonStyles';

export function LessonScreen({ route, navigation }: NativeStackScreenProps<CoursesStackParamList, 'Lesson'>) {
  const { lessonId, courseId } = route.params;
  const flow = useMemo(() => new LessonFlow(lessonId), [lessonId]);
  const state = useSyncExternalStore(flow.subscribe, flow.snapshot);
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  useEffect(() => { void flow.load(); return () => flow.dispose(); }, [flow]);
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [state.stepId]);
  useEffect(() => { if (state.result) navigation.replace('LessonResult', { courseId, result: state.result }); }, [state.result, courseId, navigation]);
  const exit = useCallback(() => navigation.popTo('Roadmap', { courseId }), [navigation, courseId]);
  const back = useCallback(() => { if (!flow.back()) exit(); }, [flow, exit]);
  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    return () => subscription.remove();
  }, [back]));
  const locked = state.error instanceof ApiError && state.error.code === 'LESSON_ACCESS_REQUIRED';
  if (state.loading) return <View style={[s.center, { backgroundColor: '#FFF', alignItems: 'center', paddingTop: insets.top }]}>
    <ActivityIndicator color="#0062E9" /><Text style={s.caption}>Preparando tu lección…</Text>
  </View>;
  if (!state.data || locked) return <View style={[s.center, { paddingTop: insets.top + 24 }]}>
    <>
      <Text style={s.title}>{locked ? 'Acceso Premium' : 'No pudimos abrir la lección'}</Text>
      <Text style={locked ? [s.body, { color: '#84550C' }] : s.error}>{lessonError(state.error)}</Text>
      <Button title={locked ? 'Obtener acceso' : 'Reintentar'} tone={locked ? 'gold' : 'blue'} busy={state.busy} onPress={locked ? showAccessInfo : flow.load} />
    </>
    <Button title="Volver a la ruta" tone="blue" onPress={exit} />
  </View>;
  const data = state.data;
  const step = data.steps.find(item => item.id === state.stepId);
  const activity = step?.blocks.find(block => block.type === 'ACTIVITY');
  return <KeyboardAvoidingView style={[s.page, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={local.header}>
      <View style={local.row}>
        <Pressable disabled={state.busy} onPress={back} accessibilityRole="button" accessibilityLabel="Volver" style={local.back}><LearningIcon kind="back" plain size={32} /></Pressable>
        <Text style={local.topic}>{data.lesson.topic.title}</Text>
        <Text style={s.caption}>{data.lesson.position.lesson} de {data.lesson.position.totalLessons}</Text>
      </View>
      {state.progress ? <ProgressBar percentage={state.progress.percentage} /> : null}
    </View>
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, { flexGrow: 1, paddingBottom: Math.max(24, insets.bottom + 12) }]}>
      {step?.type !== 'ACTIVITY_STEP' ? <>
        {data.lesson.course.level ? <Text style={s.chip}>{data.lesson.course.level}{state.review ? ' · Repaso' : ''}</Text> : null}
        <Text style={s.title}>{step?.type === 'SUMMARY_STEP' ? 'Resumen de la lección' : data.lesson.title}</Text>
        {step?.type === 'CONTENT_STEP' && data.lesson.description ? <Text style={[s.body, { marginTop: -8 }]}>{data.lesson.description}</Text> : null}
      </> : null}
      {state.error ? <Text accessibilityLiveRegion="polite" style={s.error}>{lessonError(state.error)}</Text> : null}
      {step?.type === 'ACTIVITY_STEP' && activity?.type === 'ACTIVITY' ?
        <ActivityStep key={step.id} activity={activity.activity} feedback={state.feedback} busy={state.busy} initialAnswer={state.answer}
          onSubmit={flow.submit} onRetry={flow.retryAnswer} onContinue={flow.continueFeedback}
          onSkip={flow.canContinueActivity() ? flow.continueVisited : undefined} />
        : step ? <>
          <ContentBlocks blocks={step.blocks} />
          <Button title={step.type === 'SUMMARY_STEP' ? 'Finalizar lección' : 'Continuar'} arrow busy={state.busy}
            onPress={step.type === 'SUMMARY_STEP' ? flow.finish : flow.continueContent} />
        </> : <View style={s.card}><Text style={s.body}>Ya recorriste los pasos requeridos. Finaliza para ver tu resultado.</Text><Button title="Ver resultado" busy={state.busy} onPress={flow.finish} /></View>}
    </ScrollView>
  </KeyboardAvoidingView>;
}
const local = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 8, width: '100%', maxWidth: 640, alignSelf: 'center', backgroundColor: '#FFF' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  back: { width: 44, minHeight: 48, justifyContent: 'center', alignItems: 'center', marginLeft: -10 },
  topic: { flex: 1, fontSize: 15, lineHeight: 20, fontWeight: '700', color: '#101B4D', paddingVertical: 6 },
});
