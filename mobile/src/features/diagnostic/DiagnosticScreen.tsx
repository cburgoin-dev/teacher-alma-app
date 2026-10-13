import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { ActivityIndicator, Alert, BackHandler, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, usePreventRemove } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../navigation/types';
import { ContextualHeader } from '../../components/ContextualHeader';
import { AlmaLogo } from '../../components/AlmaLogo';
import { Button, ProgressBar } from '../courses/components/ui';
import { CourseCard } from '../courses/components/CourseCard';
import { ActivityStep } from '../lessons/components/ActivityStep';
import { LearningIcon } from '../lessons/components/LearningIcon';
import { lessonAudio } from '../lessons/components/AudioButton';
import { lessonStyles as s } from '../lessons/components/lessonStyles';
import { DiagnosticFlow } from './flow';
import { diagnosticError, questionProgress, resultCourseAction } from './presentation';

export function DiagnosticScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'Diagnostic'>) {
  const flow = useMemo(() => new DiagnosticFlow(route.params?.view), [route.key]);
  const state = useSyncExternalStore(flow.subscribe, flow.snapshot);
  const insets = useSafeAreaInsets();
  useEffect(() => { void flow.load(); return () => flow.dispose(); }, [flow]);
  useEffect(() => () => lessonAudio.stop(), [state.active?.question.id]);
  useFocusEffect(useCallback(() => () => lessonAudio.stop(), []));
  const back = useCallback(() => { if (!flow.back()) navigation.goBack(); }, [flow, navigation]);
  useEffect(() => { if (state.exited) navigation.goBack(); }, [state.exited, navigation]);
  useEffect(() => {
    if (!state.exitRequested) return;
    Alert.alert('¿Salir del diagnóstico?', 'Perderás el progreso de este intento. Al volver tendrás que comenzar un nuevo diagnóstico.', [
      { text: 'Continuar diagnóstico', style: 'cancel', onPress: flow.cancelExit },
      { text: 'Salir', style: 'destructive', onPress: () => { void flow.confirmExit(); } },
    ], { cancelable: true, onDismiss: flow.cancelExit });
  }, [state.exitRequested, flow]);
  useFocusEffect(useCallback(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    return () => sub.remove();
  }, [back]));
  usePreventRemove(!state.exited && !!(state.active || state.startKey), () => { flow.back(); });
  const explore = () => navigation.popTo('MainTabs', { screen: 'CoursesTab' });
  const question = state.active?.question;
  const metadata = state.metadata?.diagnostic;
  const result = state.result;
  const action = result ? resultCourseAction(result) : null;
  const openCourse = () => { if (action) navigation.replace(action.screen, action.params); };
  return <KeyboardAvoidingView style={[s.page, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ContextualHeader title={state.phase === 'result' ? 'Resultado del diagnóstico' : 'Diagnóstico'}
      position={question ? `${question.position} de ${question.totalQuestions}` : undefined}
      onBack={back} disabled={state.busy} backLabel={question ? 'Salir del diagnóstico' : 'Volver'}>
      {question ? <ProgressBar percentage={questionProgress(question)} /> : null}
    </ContextualHeader>
    {state.phase === 'questions' && question ? <ActivityStep key={question.id}
      mode="DIAGNOSTIC" activity={question.activity} feedback={null} busy={state.busy}
      answerLocked={!!state.pending} initialAnswer={state.pending?.answer} bottomInset={insets.bottom}
      error={state.error ? diagnosticError(state.error) : undefined}
      submitLabel={state.pending && state.error ? 'Reintentar envío' : question.position === question.totalQuestions ? 'Ver resultado' : 'Siguiente'}
      onSubmit={flow.submit} onContinue={() => {}} />
      : <ScrollView contentContainerStyle={[s.content, local.content, { paddingBottom: Math.max(24, insets.bottom + 12) }]}>
        {state.error ? <Text accessibilityLiveRegion="polite" style={s.error}>{diagnosticError(state.error)}</Text> : null}
        {state.phase === 'intro' ? <>
          {!state.metadata ? <View style={local.status}>
            {state.busy ? <><ActivityIndicator color="#0062E9" /><Text style={s.caption}>Preparando tu diagnóstico…</Text></>
              : <Button title="Reintentar" onPress={flow.load} />}
          </View> : state.metadata.available && metadata ? <>
            <View style={local.introHero}><AlmaLogo horizontal horizontalWidth={200} />
              <Text style={local.eyebrow}>TU PUNTO DE PARTIDA</Text>
              <Text accessibilityRole="header" style={[s.title, local.centered]}>{metadata.title}</Text>
              <Text style={[s.body, local.centered]}>Realiza este diagnóstico opcional para recibir una recomendación de por dónde empezar.</Text>
            </View>
            <View style={local.facts}>
              <View style={local.fact}><Text style={s.heading}>{metadata.questionCount} preguntas</Text><Text style={s.caption}>A tu ritmo</Text></View>
              {metadata.estimatedMinutes !== null ? <View style={local.fact}><Text style={s.heading}>{metadata.estimatedMinutes} min</Text><Text style={s.caption}>Tiempo estimado</Text></View> : null}
            </View>
            <View style={s.card}><Text style={s.heading}>Empieza con más claridad</Text>
              <View style={local.benefit}><LearningIcon kind="bulb" /><Text style={[s.body, local.flex]}>Recibe una recomendación de curso para orientar tu aprendizaje.</Text></View>
              <Text style={s.caption}>No es una certificación de nivel. Responde todas las preguntas; verás tu recomendación al terminar.</Text>
              <Text style={s.caption}>Si sales durante el diagnóstico, tendrás que comenzar de nuevo.</Text>
            </View>
            <Button title={state.startKey && state.error ? 'Reintentar inicio' : 'Comenzar diagnóstico'} arrow busy={state.busy} onPress={flow.start} />
          </> : <View style={s.card}><Text style={s.title}>Por ahora, explora los cursos</Text><Text style={s.body}>El diagnóstico no está disponible en este momento. Puedes elegir por dónde empezar.</Text><Button title="Explorar cursos" onPress={explore} /></View>}
          <Button title="Ahora no" tone="blue" disabled={state.busy} onPress={back} />
        </> : state.phase === 'result' ? result ? <>
          <View style={local.resultHero}>
            <Text style={local.eyebrow}>TU NIVEL RECOMENDADO</Text>
            <Text style={s.heading}>Te recomendamos empezar en</Text>
            <Text accessibilityRole="header" style={local.level}>Inglés {result.recommendedLevel}</Text>
            <Text style={s.body}>Este es un punto de partida para continuar aprendiendo. La recomendación no es una certificación de nivel.</Text>
            <Text style={s.caption}>Completado el {new Date(result.completedAt).toLocaleDateString('es-MX')}</Text>
          </View>
          {result.recommendedCourse && action ? <>
            <CourseCard course={result.recommendedCourse} actionLabel={action.title} onPress={openCourse} />
            <Button title={action.title} arrow onPress={openCourse} />
          </> : <Text style={s.body}>El curso recomendado ya no está disponible. Explora el catálogo para elegir tu próximo paso.</Text>}
          <Button title={result.recommendedCourse ? 'Explorar otros cursos' : 'Explorar cursos'} tone="blue" arrow onPress={explore} />
          <View style={local.retake}><Text style={[s.caption, local.centered]}>Puedes repetir el diagnóstico para recibir una nueva recomendación.</Text>
            <Button title="Repetir diagnóstico" tone="blue" onPress={flow.retake} />
          </View>
        </> : <View style={local.status}>
          {state.busy ? <><ActivityIndicator color="#0062E9" /><Text style={s.caption}>Buscando tu resultado…</Text></> : <>
            <Button title="Reintentar" onPress={flow.load} /><Button title="Hacer un diagnóstico" tone="blue" onPress={flow.retake} /><Button title="Explorar cursos" tone="blue" onPress={explore} />
          </>}
        </View> : <View style={s.card}><Text style={s.title}>Comienza un nuevo diagnóstico</Text>
          {state.active ? <Button title="Salir de este intento" busy={state.busy} onPress={back} /> : <>
            <Button title="Ir al inicio" onPress={flow.retake} /><Button title="Explorar cursos" tone="blue" onPress={explore} />
          </>}
        </View>}
      </ScrollView>}
  </KeyboardAvoidingView>;
}
const local = StyleSheet.create({
  content: { flexGrow: 1, gap: 20 },
  introHero: { alignItems: 'center', backgroundColor: '#F2F7FF', borderRadius: 24, padding: 22, gap: 18 },
  centered: { textAlign: 'center' },
  eyebrow: { color: '#0062E9', fontSize: 12, lineHeight: 18, fontWeight: '800', letterSpacing: 1.3 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  fact: { flexGrow: 1, padding: 14, backgroundColor: '#EEF6FF', borderRadius: 18, gap: 4 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  resultHero: { backgroundColor: '#EAF4FF', borderRadius: 24, borderWidth: 1, borderColor: '#D2E5FF', padding: 22, gap: 14 },
  level: { fontSize: 36, lineHeight: 44, fontWeight: '800', color: '#0062E9' },
  status: { flex: 1, justifyContent: 'center', gap: 18, paddingVertical: 24 },
  retake: { borderTopWidth: 1, borderTopColor: '#D2E5FF', paddingTop: 18, gap: 10 },
});
