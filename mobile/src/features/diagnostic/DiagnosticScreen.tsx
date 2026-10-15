import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, Alert, BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, usePreventRemove } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../navigation/types';
import { ContextualHeader } from '../../components/ContextualHeader';
import Clock from 'lucide-react-native/icons/clock';
import ListChecks from 'lucide-react-native/icons/list-checks';
import Target from 'lucide-react-native/icons/target';
import Info from 'lucide-react-native/icons/info';
import { colors, shadows } from '../../theme';
import { AlmaLogo } from '../../components/AlmaLogo';
import { Button, ProgressBar } from '../courses/components/ui';
import { CourseCard } from '../courses/components/CourseCard';
import { CourseVisualIcon } from '../courses/components/CourseVisualIcon';
import { ActivityStep } from '../lessons/components/ActivityStep';
import { LearningIcon } from '../lessons/components/LearningIcon';
import { lessonAudio } from '../lessons/components/AudioButton';
import { lessonStyles as s } from '../lessons/components/lessonStyles';
import { DiagnosticFlow } from './flow';
import { loadCourseMetadata } from './courseMetadata';
import { HeroArtwork } from './HeroArtwork';
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
  const courseId = result?.recommendedCourse?.id;
  const [courseMetadata, setCourseMetadata] = useState<{ id: string; label: string } | null>(null);
  useEffect(() => {
    if (!courseId) return;
    return loadCourseMetadata(courseId, label => setCourseMetadata({ id: courseId, label }));
  }, [courseId, result?.attemptId]);
  const action = result ? resultCourseAction(result) : null;
  const openCourse = () => { if (action) navigation.replace(action.screen, action.params); };
  return <KeyboardAvoidingView style={[s.page, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ContextualHeader title={state.phase === 'result' ? 'Resultado del diagnóstico' : 'Diagnóstico'}
      position={question ? `${question.position} de ${question.totalQuestions}` : undefined}
      onBack={back} disabled={state.busy} backLabel={question ? 'Salir del diagnóstico' : 'Volver'}>
      {question ? <ProgressBar percentage={questionProgress(question)} minimal /> : null}
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
            <View style={local.introHero}>
              <View style={local.brandScene}>
                <View pointerEvents="none" style={StyleSheet.absoluteFill}><HeroArtwork /></View>
                <AlmaLogo horizontal horizontalWidth={210} />
                <View accessible={false} style={local.sceneRule} />
              </View>
              <Text accessibilityRole="header" style={local.introTitle}>Descubre tu nivel</Text>
              <Text style={[local.introCopy, local.centered]}>Realiza un breve test opcional para que podamos recomendarte por dónde empezar.</Text>
            </View>
            <View style={local.facts}>
              {metadata.estimatedMinutes !== null ? <View style={local.fact}><View style={local.factIcon}><Clock size={22} color={colors.blue} /></View><View style={local.flex}><Text style={local.factTitle}>{metadata.estimatedMinutes} minutos</Text><Text style={local.small}>Tiempo estimado</Text></View></View> : null}
              <View style={local.fact}><View style={local.factIcon}><ListChecks size={22} color={colors.blue} /></View><View style={local.flex}><Text style={local.factTitle}>{metadata.questionCount} preguntas</Text><Text style={local.small}>Preguntas cortas</Text></View></View>
            </View>
            <View style={local.benefits}>
              <Text style={local.benefitsTitle}>Este diagnóstico te ayuda a:</Text>
              <View style={local.benefit}><View accessible={false} style={local.levelIcon}><View style={[local.bar, { height: 10 }]} /><View style={[local.bar, { height: 17 }]} /><View style={[local.bar, { height: 25 }]} /></View><View style={local.flex}><Text style={local.benefitTitle}>Descubrir tu nivel inicial</Text><Text style={local.small}>Conoce tu punto de partida.</Text></View></View>
              <View style={local.benefit}><View accessible={false} style={local.roseIcon}><Target size={27} color={colors.red} strokeWidth={2.5} /></View><View style={local.flex}><Text style={local.benefitTitle}>Recomendar el curso adecuado</Text><Text style={local.small}>Te sugerimos la mejor ruta para ti.</Text></View></View>
              <View style={local.benefit}><View style={local.blueIcon}><LearningIcon kind="bulb" plain size={27} /></View><View style={local.flex}><Text style={local.benefitTitle}>Empezar con más claridad</Text><Text style={local.small}>Avanza con un plan que se adapte a ti.</Text></View></View>
            </View>
            <Button title={state.startKey && state.error ? 'Reintentar inicio' : 'Comenzar diagnóstico'} arrow busy={state.busy} onPress={flow.start} />
          </> : <View style={s.card}><Text style={s.title}>Por ahora, explora los cursos</Text><Text style={s.body}>El diagnóstico no está disponible en este momento. Puedes elegir por dónde empezar.</Text><Button title="Explorar cursos" onPress={explore} /></View>}
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: state.busy }} disabled={state.busy} onPress={back} style={local.textAction}><Text style={local.link}>Ahora no</Text></Pressable>
        </> : state.phase === 'result' ? result ? <>
          <View style={local.resultHero}>
            <View pointerEvents="none" accessible={false} style={local.resultArtwork}>
              <HeroArtwork result />
            </View>
            <View style={local.resultEditorial}>
            <Text style={local.eyebrow}>TU NIVEL RECOMENDADO</Text>
            <Text style={local.recommendation}>Te recomendamos empezar en</Text>
            <Text accessibilityRole="header" style={local.level}>Inglés {result.recommendedLevel}</Text>
            <View style={local.accent} />
            <Text style={local.resultCopy}>Empieza aquí para reforzar lo que sabes y seguir aprendiendo, paso a paso, con confianza.</Text>
            </View>
          </View>
          <Text style={local.sectionTitle}>TU SIGUIENTE PASO</Text>
          {result.recommendedCourse && action ? <>
            <CourseCard course={result.recommendedCourse} actionLabel={action.title} showAction={false}
              academicMetadata={courseMetadata?.id === courseId ? courseMetadata?.label : undefined} onPress={openCourse} />
            <Button title={action.title} arrow onPress={openCourse} />
          </> : <Text style={s.body}>El curso recomendado ya no está disponible. Explora el catálogo para elegir tu próximo paso.</Text>}
          {result.recommendedCourse ? <Pressable accessibilityRole="button" onPress={explore} style={local.outlineAction}><Text style={local.link}>Explorar otros cursos</Text><CourseVisualIcon name="arrow" color={colors.blue} size={21} /></Pressable> : <Button title="Explorar cursos" arrow onPress={explore} />}
          <View style={local.disclaimer}>
            <View style={local.note}><Info size={17} color={colors.muted} /><Text style={[local.small, local.flex]}>Esta recomendación es un punto de partida y no una certificación oficial de nivel.</Text></View>
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
  content: { flexGrow: 1, gap: 20, paddingTop: 8 },
  introHero: { alignItems: 'center', gap: 14, paddingBottom: 6 },
  brandScene: { height: 164, width: '100%', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 28, borderBottomLeftRadius: 48, backgroundColor: '#F2F8FF', marginBottom: 6 },
  sceneRule: { width: 34, height: 4, borderRadius: 2, backgroundColor: colors.red, position: 'absolute', bottom: 30, transform: [{ rotate: '-8deg' }] },
  introTitle: { fontSize: 29, lineHeight: 35, fontWeight: '800', letterSpacing: -.7, color: colors.ink, textAlign: 'center' },
  introCopy: { color: colors.muted, fontSize: 16, lineHeight: 23 },
  centered: { textAlign: 'center' },
  eyebrow: { color: colors.blue, fontSize: 11, lineHeight: 17, fontWeight: '800', letterSpacing: 1.4 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingVertical: 4 },
  fact: { flexGrow: 1, flexBasis: 140, flexDirection: 'row', alignItems: 'center', gap: 9 },
  factIcon: { padding: 10, backgroundColor: '#EDF5FF', borderRadius: 24 },
  factTitle: { color: colors.ink, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  small: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  benefits: { padding: 18, gap: 18, borderWidth: 1, borderColor: '#E5EDF8', borderRadius: 22, backgroundColor: '#FFF', ...shadows.card },
  benefitsTitle: { color: colors.ink, fontSize: 18, lineHeight: 24, fontWeight: '800' },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitTitle: { color: colors.ink, fontSize: 15, lineHeight: 21, fontWeight: '700' },
  roseIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF0F3', alignItems: 'center', justifyContent: 'center' },
  blueIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E3F2FF', alignItems: 'center', justifyContent: 'center' },
  levelIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E3F2FF', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 10, gap: 3 },
  bar: { width: 5, borderRadius: 3, backgroundColor: colors.blue },
  flex: { flex: 1, minWidth: 0 },
  resultHero: { backgroundColor: '#EBF5FF', borderRadius: 24, borderBottomRightRadius: 48, borderWidth: 1, borderColor: '#CEE3FC', padding: 20, overflow: 'hidden' },
  resultEditorial: { gap: 8 },
  resultArtwork: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  recommendation: { color: colors.ink, fontSize: 21, lineHeight: 26, fontWeight: '700', letterSpacing: -.4, marginTop: 5 },
  level: { fontSize: 38, lineHeight: 46, fontWeight: '800', letterSpacing: -.9, color: colors.blue, flexShrink: 1 },
  accent: { width: 42, height: 4, backgroundColor: colors.red, borderRadius: 2, marginVertical: 2 },
  resultCopy: { color: '#45658F', fontSize: 15, lineHeight: 22 },
  sectionTitle: { fontSize: 11, lineHeight: 17, color: colors.muted, fontWeight: '800', letterSpacing: 1.2, marginTop: 4 },
  status: { flex: 1, justifyContent: 'center', gap: 18, paddingVertical: 24 },
  outlineAction: { borderRadius: 28, borderWidth: 1, borderColor: '#D5E7FC', backgroundColor: '#F0F7FF', minHeight: 48, padding: 12, flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'center' },
  textAction: { minHeight: 48, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  link: { fontSize: 16, lineHeight: 22, fontWeight: '700', color: colors.blue, textAlign: 'center', flexShrink: 1 },
  disclaimer: { borderTopWidth: 1, borderTopColor: '#E0EAF7', paddingTop: 14, marginTop: 4 },
  note: { flexDirection: 'row', gap: 8, alignItems: 'center' },
});
