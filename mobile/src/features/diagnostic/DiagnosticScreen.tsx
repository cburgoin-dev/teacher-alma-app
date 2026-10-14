import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { ActivityIndicator, Alert, BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, usePreventRemove } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../navigation/types';
import { ContextualHeader } from '../../components/ContextualHeader';
import Clock from 'lucide-react-native/icons/clock';
import ListChecks from 'lucide-react-native/icons/list-checks';
import Compass from 'lucide-react-native/icons/compass';
import RotateCcw from 'lucide-react-native/icons/rotate-ccw';
import Info from 'lucide-react-native/icons/info';
import Sparkles from 'lucide-react-native/icons/sparkles';
import { colors, shadows } from '../../theme';
import { AlmaLogo } from '../../components/AlmaLogo';
import { Button, ProgressBar } from '../courses/components/ui';
import { CourseCard } from '../courses/components/CourseCard';
import { ActivityStep } from '../lessons/components/ActivityStep';
import { LearningIcon } from '../lessons/components/LearningIcon';
import { lessonAudio } from '../lessons/components/AudioButton';
import { lessonStyles as s } from '../lessons/components/lessonStyles';
import { DiagnosticFlow } from './flow';
import { diagnosticError, introHeading, questionProgress, resultCourseAction } from './presentation';

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
  const heading = metadata ? introHeading(metadata.title, typeof __DEV__ !== 'undefined' && __DEV__) : null;
  const result = state.result;
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
                <View pointerEvents="none" accessible={false} style={local.orbit} />
                <View pointerEvents="none" accessible={false} style={local.orbitSmall} />
                <View style={local.brandPlaque}><AlmaLogo horizontal horizontalWidth={190} /></View>
                <View accessible={false} style={local.sceneCompass}><Compass size={38} color={colors.blue} strokeWidth={1.6} /></View>
                <View accessible={false} style={local.sceneSpark}><Sparkles size={24} color={colors.red} strokeWidth={1.8} /></View>
                <View accessible={false} style={local.sceneRule} />
              </View>
              <Text style={local.eyebrow}>TU PUNTO DE PARTIDA{heading?.demo ? ' · DEMO' : ''}</Text>
              <Text accessibilityRole="header" style={local.introTitle}>{heading?.title}</Text>
              <Text style={[s.body, local.centered]}>Un diagnóstico opcional para encontrar por dónde empezar.</Text>
            </View>
            <View style={local.facts}>
              {metadata.estimatedMinutes !== null ? <View style={local.fact}><View style={local.factIcon}><Clock size={22} color={colors.blue} /></View><View style={local.flex}><Text style={local.factTitle}>{metadata.estimatedMinutes} min</Text><Text style={local.small}>Tiempo estimado</Text></View></View> : null}
              <View style={local.fact}><View style={local.factIcon}><ListChecks size={22} color={colors.blue} /></View><View style={local.flex}><Text style={local.factTitle}>{metadata.questionCount} preguntas</Text><Text style={local.small}>A tu ritmo</Text></View></View>
            </View>
            <View style={local.benefits}>
              <Text style={s.heading}>Empieza con más claridad</Text>
              <View style={local.benefit}><LearningIcon kind="bulb" /><View style={local.flex}><Text style={local.benefitTitle}>Encuentra tu punto de partida</Text><Text style={local.small}>Una orientación para tu aprendizaje.</Text></View></View>
              <View style={local.benefit}><View style={local.roseIcon}><Compass size={24} color={colors.red} /></View><View style={local.flex}><Text style={local.benefitTitle}>Descubre el curso recomendado</Text><Text style={local.small}>Elige cómo seguir al terminar.</Text></View></View>
            </View>
            <Text style={[local.small, local.centered]}>No es una certificación. Si sales, empiezas de nuevo.</Text>
            <Button title={state.startKey && state.error ? 'Reintentar inicio' : 'Comenzar diagnóstico'} arrow busy={state.busy} onPress={flow.start} />
          </> : <View style={s.card}><Text style={s.title}>Por ahora, explora los cursos</Text><Text style={s.body}>El diagnóstico no está disponible en este momento. Puedes elegir por dónde empezar.</Text><Button title="Explorar cursos" onPress={explore} /></View>}
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: state.busy }} disabled={state.busy} onPress={back} style={local.textAction}><Text style={local.link}>Ahora no</Text></Pressable>
        </> : state.phase === 'result' ? result ? <>
          <View style={local.resultHero}>
            <View pointerEvents="none" accessible={false} style={local.resultOrbit} />
            <View style={local.resultTop}><Text style={[local.eyebrow, local.flex]}>TU NIVEL RECOMENDADO</Text><View accessible={false} style={local.sparkBadge}><Sparkles size={25} color={colors.blue} strokeWidth={1.6} /></View></View>
            <Text style={local.recommendation}>Te recomendamos empezar en</Text>
            <Text accessibilityRole="header" style={local.level}>Inglés {result.recommendedLevel}</Text>
            <View style={local.accent} />
            <Text style={local.resultCopy}>Un nuevo punto de partida para seguir aprendiendo.</Text>
          </View>
          <Text style={local.sectionTitle}>TU SIGUIENTE PASO</Text>
          {result.recommendedCourse && action ? <>
            <CourseCard course={result.recommendedCourse} actionLabel={action.title} showAction={false} onPress={openCourse} />
            <Button title={action.title} arrow onPress={openCourse} />
          </> : <Text style={s.body}>El curso recomendado ya no está disponible. Explora el catálogo para elegir tu próximo paso.</Text>}
          {result.recommendedCourse ? <Pressable accessibilityRole="button" onPress={explore} style={local.outlineAction}><Text style={local.link}>Explorar otros cursos</Text></Pressable> : <Button title="Explorar cursos" arrow onPress={explore} />}
          <View style={local.retake}>
            <View style={local.note}><Info size={18} color={colors.muted} /><Text style={[local.small, local.flex]}>Una recomendación, no una certificación de nivel.</Text></View>
            <Pressable accessibilityRole="button" onPress={flow.retake} style={local.textAction}><RotateCcw size={17} color={colors.muted} /><Text style={local.retakeLink}>Repetir diagnóstico</Text></Pressable>
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
  content: { flexGrow: 1, gap: 16, paddingTop: 8 },
  introHero: { alignItems: 'center', gap: 10, paddingBottom: 6 },
  brandScene: { height: 124, width: '100%', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 24, backgroundColor: '#F4F8FF' },
  orbit: { position: 'absolute', width: 220, height: 220, borderRadius: 110, borderWidth: 24, borderColor: '#E3EEFF', right: -50, top: -120 },
  orbitSmall: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: '#E8F2FF', left: -45, bottom: -65 },
  brandPlaque: { backgroundColor: '#FFF', borderRadius: 18, padding: 16, transform: [{ rotate: '-3deg' }], ...shadows.card },
  sceneCompass: { position: 'absolute', right: 12, bottom: 8, backgroundColor: '#FFF', borderRadius: 28, padding: 7 },
  sceneSpark: { position: 'absolute', left: 16, top: 12 },
  sceneRule: { width: 28, height: 4, borderRadius: 2, backgroundColor: colors.red, position: 'absolute', left: 45, bottom: 15, transform: [{ rotate: '-12deg' }] },
  introTitle: { fontSize: 29, lineHeight: 35, fontWeight: '800', letterSpacing: -.7, color: colors.ink, textAlign: 'center' },
  centered: { textAlign: 'center' },
  eyebrow: { color: colors.blue, fontSize: 11, lineHeight: 17, fontWeight: '800', letterSpacing: 1.4 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingVertical: 4 },
  fact: { flexGrow: 1, flexBasis: 140, flexDirection: 'row', alignItems: 'center', gap: 9 },
  factIcon: { padding: 10, backgroundColor: '#EDF5FF', borderRadius: 24 },
  factTitle: { color: colors.ink, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  small: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  benefits: { padding: 16, gap: 15, borderWidth: 1, borderColor: '#E5EDF8', borderRadius: 22, backgroundColor: '#FFF', ...shadows.card },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitTitle: { color: colors.ink, fontSize: 15, lineHeight: 21, fontWeight: '700' },
  roseIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF0F3', alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, minWidth: 0 },
  resultHero: { backgroundColor: '#EBF5FF', borderRadius: 24, borderWidth: 1, borderColor: '#CEE3FC', padding: 22, gap: 12, overflow: 'hidden' },
  resultOrbit: { position: 'absolute', width: 240, height: 240, borderRadius: 120, borderWidth: 32, borderColor: '#DDECFF', top: -135, right: -105 },
  resultTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sparkBadge: { backgroundColor: '#FFF', padding: 9, borderRadius: 24 },
  recommendation: { color: colors.ink, fontSize: 23, lineHeight: 29, fontWeight: '700', letterSpacing: -.4 },
  level: { fontSize: 40, lineHeight: 48, fontWeight: '800', letterSpacing: -.9, color: colors.blue, flexShrink: 1 },
  accent: { width: 42, height: 4, backgroundColor: colors.red, borderRadius: 2, marginVertical: 2 },
  resultCopy: { color: '#45658F', fontSize: 15, lineHeight: 22 },
  sectionTitle: { fontSize: 11, lineHeight: 17, color: colors.muted, fontWeight: '800', letterSpacing: 1.2, marginTop: 4 },
  status: { flex: 1, justifyContent: 'center', gap: 18, paddingVertical: 24 },
  outlineAction: { borderRadius: 28, borderWidth: 1, borderColor: '#CCDEF7', minHeight: 48, padding: 12, alignItems: 'center', justifyContent: 'center' },
  textAction: { minHeight: 48, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  link: { fontSize: 16, lineHeight: 22, fontWeight: '700', color: colors.blue, textAlign: 'center', flexShrink: 1 },
  retake: { borderTopWidth: 1, borderTopColor: '#E0EAF7', paddingTop: 14, gap: 4 },
  note: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  retakeLink: { color: colors.muted, fontSize: 14, lineHeight: 20, fontWeight: '600', flexShrink: 1 },
});
