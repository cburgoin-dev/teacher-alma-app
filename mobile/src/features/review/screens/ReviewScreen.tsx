import { GamificationDeltaCard } from '../../gamification/components/GamificationDeltaCard';
import { useStreakCelebration } from '../../gamification/hooks/useStreakCelebration';
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { ActivityIndicator, Alert, BackHandler, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, usePreventRemove } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CoursesStackParamList } from '../../../navigation/types';
import { ContextualHeader } from '../../../components/ContextualHeader';
import { Button, ProgressBar } from '../../courses/components/ui';
import { ActivityStep } from '../../lessons/components/ActivityStep';
import { LearningIcon } from '../../lessons/components/LearningIcon';
import { CompletionHero } from '../../lessons/screens/LessonResultScreen';
import { lessonAudio } from '../../lessons/components/AudioButton';
import { lessonStyles as s } from '../../lessons/components/lessonStyles';
import { ReviewFlow } from '../flow';
import { reviewError, reviewResult } from '../presentation';

export function ReviewScreen({ route, navigation }: NativeStackScreenProps<CoursesStackParamList, 'Review'>) {
  const { courseId, preferredLessonId } = route.params;
  const flow = useMemo(() => new ReviewFlow(preferredLessonId), [preferredLessonId]);
  const state = useSyncExternalStore(flow.subscribe, flow.snapshot);
  const insets = useSafeAreaInsets();
  const celebration = useStreakCelebration();
  const finalResponse = state.outcomes[state.outcomes.length - 1]?.response;
  const exit = useCallback(() => courseId ? navigation.popTo('Roadmap', { courseId }) : navigation.popTo('Courses'), [navigation, courseId]);
  useEffect(() => { void flow.load(); return flow.dispose; }, [flow]);
  useEffect(() => { if (state.exited) exit(); }, [state.exited, exit]);
  useEffect(() => () => lessonAudio.stop(), [state.index]);
  useFocusEffect(useCallback(() => () => lessonAudio.stop(), []));
  useFocusEffect(useCallback(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { flow.requestExit(); return true; });
    return () => listener.remove();
  }, [flow]));
  usePreventRemove(state.phase === 'IN_PROGRESS' && !state.exited, flow.requestExit);
  useEffect(() => {
    if (!state.exitRequested) return;
    Alert.alert('¿Salir del repaso?', 'Tus respuestas ya guardadas se conservarán y podrás continuar repasando después.', [
      { text: 'Seguir repasando', style: 'cancel', onPress: flow.cancelExit },
      { text: 'Salir', onPress: flow.confirmExit },
    ], { cancelable: true, onDismiss: flow.cancelExit });
  }, [state.exitRequested, flow]);
  const item = state.batch?.items[state.index];
  const result = reviewResult(state.outcomes);
  const progress = state.batch?.items.length ? state.index / state.batch.items.length * 100 : 0;
  const contentStyle = [s.content, { paddingBottom: Math.max(24, insets.bottom + 12) }];
  return celebration.wrap(<KeyboardAvoidingView style={[s.page, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ContextualHeader title="Repaso" onBack={flow.requestExit}
      position={state.phase === 'IN_PROGRESS' ? (state.index + 1) + ' de ' + state.batch!.items.length : undefined}>
      {state.phase === 'IN_PROGRESS' ? <ProgressBar percentage={progress} /> : null}
    </ContextualHeader>
    {state.loading ? <View style={s.center}><ActivityIndicator color="#0062E9" /><Text style={s.caption}>Preparando tu repaso…</Text></View>
      : state.phase === 'READY' ? <ScrollView key="ready" contentContainerStyle={[local.readyContent, { paddingBottom: Math.max(24, insets.bottom + 12) }]}>
        {state.error ? <View style={s.card}><Text accessibilityLiveRegion="polite" style={s.error}>No pudimos preparar tu repaso. Comprueba tu conexión y vuelve a intentarlo.</Text>
          <Button title="Reintentar" tone="blue" busy={state.busy} onPress={flow.load} /></View> : null}
        {state.summary ? <>
          <View style={local.hero}>
            <Text style={local.readyTitle}>{state.summary.pendingCount ? state.summary.pendingCount + (state.summary.pendingCount === 1 ? ' ejercicio para reforzar' : ' ejercicios para reforzar') : '¡Todo al día!'}</Text>
            <Text style={local.heroBody}>{state.summary.pendingCount ? 'Practica lo que has aprendido y sigue avanzando.' : 'No tienes ejercicios pendientes por reforzar.'}</Text>
            {state.summary.pendingCount > 0 ? <View style={local.encouragement}>
              <LearningIcon kind="bulb" size={27} />
              <View style={{ flex: 1 }}><Text style={local.blueTitle}>¡Tú puedes!</Text><Text style={local.encouragementBody}>La práctica te ayuda a recordar.</Text></View>
            </View> : null}
          </View>
          {state.summary.pendingCount > 0 ? <>
            <Text style={local.sectionTitle}>Ejercicios pendientes</Text>
            <View style={local.topicList}>{state.summary.groups.map((group, index) => {
              const palette = topicPalettes[index % topicPalettes.length]!;
              return <View key={group.topic.id} style={[local.topic, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <View style={[local.topicIcon, { backgroundColor: palette.halo }]}><LearningIcon kind="chat" plain color={palette.ink} size={27} /></View>
                <Text style={local.topicTitle}>{group.topic.title}</Text>
                <View style={local.count}><View style={[local.countBadge, { backgroundColor: palette.halo }]}><Text style={[local.readyNumber, { color: palette.ink }]}>{group.count}</Text></View><Text style={local.countLabel}>{group.count === 1 ? 'ejercicio' : 'ejercicios'}</Text></View>
              </View>;
            })}</View>
            <View style={local.start}>{state.summary.pendingCount > 5 ? <Text style={local.sessionNote}>Este repaso incluirá 5 de tus {state.summary.pendingCount} ejercicios pendientes.</Text> : null}<Button title="Empezar repaso" arrow busy={state.busy} onPress={flow.start} /></View>
          </> : null}
        </> : null}
        <Button title={state.summary?.pendingCount ? 'Más tarde' : courseId ? 'Volver a la ruta' : 'Volver a cursos'} tone="blue" onPress={flow.requestExit} />
      </ScrollView> : state.phase === 'RESULT' ? <ScrollView key="result" contentContainerStyle={contentStyle}>
        <View style={local.resultHero}><CompletionHero perfect={false} />
          <Text style={[local.title, { textAlign: 'center' }]}>{state.expired ? 'Tu repaso hasta ahora' : '¡Repaso completado!'}</Text>
          <Text style={local.resultSubtitle}>{state.expired ? 'Estas son tus respuestas confirmadas. Puedes iniciar otro repaso cuando quieras.' : 'Cada ejercicio te ayuda a seguir aprendiendo.'}</Text>
        </View>
        <Text style={local.summaryLabel}>En este repaso</Text>
        <View style={local.stats}>
          <View style={[local.stat, { backgroundColor: '#EFFAF5', borderColor: '#D8F2E5' }]}>
            <View style={local.statHeading}><LearningIcon kind="completion" /><Text style={local.number}>{result.resolved}</Text></View>
            <Text style={local.statTitle}>{result.resolved === 1 ? 'corregido' : 'corregidos'}</Text>
            {result.pending === 0 && result.resolved > 0 ? <Text style={local.statCaption}>¡Todos los ejercicios respondidos, corregidos!</Text> : null}
          </View>
          {result.pending > 0 ? <View style={[local.stat, { backgroundColor: '#FFF5F6', borderColor: '#FFE6EA' }]}>
            <View style={local.statHeading}><LearningIcon kind="pencil" plain color="#E62E4B" /><Text style={local.number}>{result.pending}</Text></View>
            <Text style={local.statTitle}>{result.pending === 1 ? 'sigue pendiente' : 'siguen pendientes'}</Text><Text style={local.statCaption}>Puedes reforzarlos en otro repaso.</Text></View> : null}
        </View>
        {result.skipped > 0 ? <Text style={s.caption}>{result.skipped} {result.skipped === 1 ? 'ejercicio no disponible' : 'ejercicios no disponibles'}. No se cuentan como resueltos.</Text> : null}
        <GamificationDeltaCard delta={finalResponse?.gamification} emphasis="quiet" />
        {result.topics.length > 0 ? <View style={local.topicsCard}><Text style={local.topicsTitle}>Temas repasados</Text>
          {result.topics.map(topic => <View key={topic.id} style={local.topicResult}><LearningIcon kind="chat" plain size={22} />
            <Text style={local.resultTopicTitle}>{topic.title}</Text><Text accessibilityLabel={topic.resolved + ' de ' + topic.answered + ' corregidos'} style={local.topicRatio}>{topic.resolved}/{topic.answered}</Text></View>)}
          <Text style={local.statCaption}>Ejercicios corregidos / respondidos</Text>
        </View> : null}
        <Button title={courseId ? 'Continuar mi ruta' : 'Continuar aprendiendo'} arrow onPress={() => celebration.continue(finalResponse?.gamification, `review:${finalResponse?.attempt.id}`, flow.requestExit)} />
      </ScrollView> : state.expired || state.unavailable ? <View style={s.center}>
        <Text accessibilityLiveRegion="polite" style={s.body}>{reviewError(state.error)}</Text>
        <Button title={state.expired ? 'Ver resumen' : 'Continuar'} onPress={state.expired ? flow.finishExpired : flow.continue} />
      </View> : item ? <>
        <Text style={local.topicLabel}>{item.source.topic.title}</Text>
        <ActivityStep key={item.id} mode="REVIEW" activity={item.activity}
          feedback={state.feedback ? { mode: 'REVIEW', isCorrect: state.feedback.attempt.isCorrect, feedback: state.feedback.feedback } : null}
          initialAnswer={state.pending?.answer} answerLocked={state.pending !== null} busy={state.busy} bottomInset={insets.bottom}
          error={state.error ? reviewError(state.error) : undefined}
          submitLabel={state.pending && state.error ? 'Reenviar respuesta' : 'Comprobar'}
          onSubmit={flow.submit} onContinue={flow.continue} />
      </> : null}
  </KeyboardAvoidingView>);
}
const local = StyleSheet.create({
  readyContent: { paddingHorizontal: 20, paddingTop: 8, gap: 10, width: '100%', maxWidth: 560, alignSelf: 'center' },
  hero: { backgroundColor: '#EAF4FF', padding: 18, borderRadius: 18, gap: 10, borderWidth: 1, borderColor: '#E4F0FF' },
  readyTitle: { color: '#111B43', fontSize: 24, lineHeight: 30, fontWeight: '700', maxWidth: 285 },
  heroBody: { color: '#5E76A4', fontSize: 16, lineHeight: 23 },
  title: { color: '#101B4D', fontSize: 25, lineHeight: 32, fontWeight: '700' },
  blueTitle: { color: '#0062E9', fontSize: 18, lineHeight: 24, fontWeight: '700' },
  encouragement: { marginTop: 4, padding: 12, gap: 12, flexDirection: 'row', alignItems: 'center', borderRadius: 16, backgroundColor: '#FFFFFFBB' },
  encouragementBody: { color: '#5E76A4', fontSize: 14, lineHeight: 20 },
  sectionTitle: { marginTop: 10, marginBottom: 2, color: '#172343', fontSize: 21, lineHeight: 28, fontWeight: '700' },
  topicList: { gap: 10 },
  topic: { paddingHorizontal: 12, paddingVertical: 16, gap: 10, flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1 },
  topicIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  topicTitle: { flex: 1, color: '#243252', fontSize: 16, lineHeight: 22, fontWeight: '600' },
  count: { alignItems: 'center', gap: 3, flexShrink: 0 },
  countBadge: { minWidth: 44, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 20, alignItems: 'center' },
  readyNumber: { fontSize: 23, lineHeight: 29, fontWeight: '700' },
  countLabel: { color: '#65789D', fontSize: 12, lineHeight: 17 },
  start: { marginTop: 12, gap: 9 },
  sessionNote: { color: '#5E76A4', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  number: { color: '#101B4D', fontSize: 28, lineHeight: 34, fontWeight: '700' },
  topicLabel: { paddingHorizontal: 20, paddingTop: 4, color: '#61759D', fontSize: 14, lineHeight: 20 },
  resultHero: { alignItems: 'center', gap: 8, flexShrink: 0 },
  resultSubtitle: { color: '#5E76A4', fontSize: 16, lineHeight: 23, textAlign: 'center' },
  summaryLabel: { color: '#65789D', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  statHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statTitle: { color: '#243252', fontSize: 16, lineHeight: 22, fontWeight: '600' },
  statCaption: { color: '#65789D', fontSize: 13, lineHeight: 19 },
  topicsCard: { padding: 12, gap: 8, borderRadius: 18, borderWidth: 1, borderColor: '#E1EBF8', backgroundColor: '#FCFDFF' },
  topicsTitle: { color: '#172343', fontSize: 19, lineHeight: 25, fontWeight: '700' },
  resultTopicTitle: { flex: 1, color: '#45618B', fontSize: 14, lineHeight: 20 },
  topicRatio: { color: '#45618B', fontSize: 15, lineHeight: 21, fontWeight: '700' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stat: { flexGrow: 1, flexBasis: 140, padding: 14, borderRadius: 16, borderWidth: 1, gap: 6 },
  topicResult: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 10, borderRadius: 14, backgroundColor: '#F0F7FF' },
});
const topicPalettes = [
  { surface: '#FFF5F6', border: '#FFE6EA', halo: '#FFE2E7', ink: '#E62E4B' },
  { surface: '#F0F7FF', border: '#E1EFFF', halo: '#D9EAFF', ink: '#0874EF' },
  { surface: '#FFF9EF', border: '#FFF0D9', halo: '#FFEDCC', ink: '#D98A08' },
];
