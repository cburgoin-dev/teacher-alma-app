import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { ActivityIndicator, Alert, BackHandler, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, usePreventRemove } from '@react-navigation/native';
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
import { ContextualHeader } from '../../../components/ContextualHeader';
import { courseLabel } from '../contentPresentation';
import { lessonAudio } from '../components/AudioButton';
import { lessonStyles as s } from '../components/lessonStyles';

export function LessonScreen({ route, navigation }: NativeStackScreenProps<CoursesStackParamList, 'Lesson'>) {
  const { lessonId, courseId } = route.params;
  const flow = useMemo(() => new LessonFlow(lessonId), [lessonId]);
  const state = useSyncExternalStore(flow.subscribe, flow.snapshot);
  useEffect(() => () => lessonAudio.stop(), [lessonId, state.stepId]);
  useFocusEffect(useCallback(() => () => lessonAudio.stop(), []));
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  useEffect(() => { void flow.load(); return () => flow.dispose(); }, [flow]);
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [state.stepId]);
  useEffect(() => { if (state.result) navigation.replace('LessonResult', { courseId, result: state.result }); }, [state.result, courseId, navigation]);
  const exit = useCallback(() => navigation.popTo('Roadmap', { courseId }), [navigation, courseId]);
  useEffect(() => { if (state.exited) exit(); }, [state.exited, exit]);
  useEffect(() => {
    if (!state.exitRequested) return;
    Alert.alert('¿Salir de la lección?', 'Si sales ahora, tendrás que comenzar la lección desde el principio.', [
      { text: 'Seguir aprendiendo', style: 'cancel', onPress: flow.cancelExit },
      { text: 'Salir', onPress: () => { void flow.confirmExit(); } },
    ], { cancelable: true, onDismiss: flow.cancelExit });
  }, [state.exitRequested, flow]);
  const back = useCallback(() => { if (!flow.back()) exit(); }, [flow, exit]);
  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    return () => subscription.remove();
  }, [back]));
  usePreventRemove(state.mode === 'NORMAL_RUN' && !!state.runId && !state.exited && !state.result && !state.completion, () => { flow.back(); });
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
    <ContextualHeader title={data.lesson.topic.title} position={`${data.lesson.position.lesson} de ${data.lesson.position.totalLessons}`} onBack={back} backLabel={state.mode === 'NORMAL_RUN' ? 'Salir de la lección' : 'Volver'} disabled={state.busy}>
      {state.progress ? <ProgressBar percentage={state.progress.percentage} /> : null}
    </ContextualHeader>
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, { flexGrow: 1, paddingBottom: Math.max(24, insets.bottom + 12) }]}>
      {step?.type !== 'ACTIVITY_STEP' ? <>
        {courseLabel(data.lesson.course) ? <Text style={s.chip}>{courseLabel(data.lesson.course)}{state.mode === 'REPLAY' ? ' · Repaso' : ''}</Text> : null}
        <Text style={s.title}>{step?.type === 'SUMMARY_STEP' ? step.blocks.find(block => block.type === 'SUMMARY')?.title ?? 'Resumen de la lección' : data.lesson.title}</Text>
        {step?.type === 'CONTENT_STEP' && data.lesson.description ? <Text style={[s.body, { marginTop: -8 }]}>{data.lesson.description}</Text> : null}
      </> : null}
      {state.error ? <Text accessibilityLiveRegion="polite" style={s.error}>{lessonError(state.error)}</Text> : null}
      {step?.type === 'ACTIVITY_STEP' && activity?.type === 'ACTIVITY' ?
        <ActivityStep key={step.id} activity={activity.activity} feedback={state.feedback} busy={state.busy} initialAnswer={state.answer}
          onAnswerChange={flow.rememberAnswer} onSubmit={flow.submit} onRetry={flow.retryAnswer} onContinue={flow.continueFeedback} />
        : step ? <>
          <ContentBlocks blocks={step.blocks} />
          {step.type === 'SUMMARY_STEP' && data.activityProgress ? <View style={local.completed}>
            <LearningIcon kind="completion" /><View style={{ flex: 1 }}><Text style={s.heading}>{data.activityProgress.completed} {data.activityProgress.completed === 1 ? 'actividad completada' : 'actividades completadas'}</Text><Text style={s.caption}>Ejercicios y práctica</Text></View>
          </View> : null}
          <Button title={step.type === 'SUMMARY_STEP' ? state.mode === 'REPLAY' ? 'Finalizar repaso' : 'Ver resultado' : 'Continuar'} arrow busy={state.busy}
            onPress={step.type === 'SUMMARY_STEP' ? flow.finish : flow.continueContent} />
        </> : <View style={s.card}><Text style={s.body}>Ya completaste la lección. Consulta tu resultado.</Text><Button title="Ver resultado" busy={state.busy} onPress={flow.finish} /></View>}
    </ScrollView>
  </KeyboardAvoidingView>;
}
const local = StyleSheet.create({
  completed: { padding: 16, borderRadius: 18, borderWidth: 1, borderColor: '#DDF3E7', backgroundColor: '#EFFAF5', flexDirection: 'row', alignItems: 'center', gap: 12 },
});
