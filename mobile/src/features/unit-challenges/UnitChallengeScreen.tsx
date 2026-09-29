import { useConversationScroll } from './useConversationScroll';
import { finishCompletion } from '../courses/completionMotion';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, Alert, BackHandler, KeyboardAvoidingView, Platform, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useFocusEffect, usePreventRemove } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import type { CoursesStackParamList } from '../../navigation/types';
import { ContextualHeader } from '../../components/ContextualHeader';
import { Button } from '../courses/components/ui';
import { ChallengeFlow } from './flow';
import { ChallengeBackdrop, ChallengeHero, PhaseIcon } from './ChallengeArt';
import { ConversationView, CrosswordView } from './phaseViews';
import { challengeStyles as s } from './styles';
import { colors } from '../../theme';

export function UnitChallengeScreen({ route, navigation }: NativeStackScreenProps<CoursesStackParamList, 'UnitChallenge'>) {
  const { unitChallengeId, courseId } = route.params;
  const flow = useMemo(() => new ChallengeFlow(unitChallengeId), [unitChallengeId]);
  const state = useSyncExternalStore(flow.subscribe, flow.snapshot);
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const leaving = useRef(false);
  const [exitRequested, setExitRequested] = useState(false);
  const exit = useCallback(() => setExitRequested(true), []);
  // Dispatch only after usePreventRemove has committed the unguarded render.
  const performExit = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    const snapshot = flow.snapshot();
    const progressed = snapshot.response?.run.status === 'COMPLETED' && snapshot.response.result?.passed === true && !snapshot.metadata?.progress.passed;
    navigation.popTo('Roadmap', { courseId, completionTicket: finishCompletion(route.params.completionTicket, progressed) });
  }, [navigation, courseId, flow, route.params.completionTicket]);
  useEffect(() => { void flow.load(); return flow.dispose; }, [flow]);
  const active = state.response?.run.status === 'ACTIVE' || (!state.response && !!state.metadata?.activeRun);
  const guarded = !state.exited && (active || state.pending || state.busy);
  const requestExit = useCallback(() => {
    if (state.busy || state.pending) { Alert.alert('Envío pendiente', 'Reintenta la operación para confirmar su estado antes de salir.'); return; }
    if (active) Alert.alert('¿Abandonar el reto?', 'Este intento terminará sin completarse. Para intentarlo de nuevo tendrás que comenzar desde la primera fase.', [{ text: 'Seguir', style: 'cancel' }, { text: 'Abandonar', style: 'destructive', onPress: () => { void flow.abandon(); } }]);
    else exit();
  }, [active, state.busy, state.pending, flow, exit]);
  usePreventRemove(guarded && !exitRequested, requestExit);
  useEffect(() => { if (exitRequested) performExit(); }, [exitRequested, performExit]);
  useFocusEffect(useCallback(() => { const sub = BackHandler.addEventListener('hardwareBackPress', () => { requestExit(); return true; }); return () => sub.remove(); }, [requestExit]));
  useEffect(() => { if (state.exited) exit(); }, [state.exited, exit]);
  const metadata = state.metadata;
  const phase = state.response?.phase;
  const chatScroll = useConversationScroll(phase?.type === 'CONVERSATION' ? phase.id : undefined);
  const result = state.response?.result;
  const complete = state.response?.run.status === 'COMPLETED' && !!result;
  const disabled = state.busy || state.pending;
  const canStart = metadata?.access.hasAccess && metadata.progression.unlocked;
  return <KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View pointerEvents="none" accessible={false} style={{ position: 'absolute', top: 100, bottom: 0, left: 0, right: 0, opacity: phase ? .35 : .85 }}><ChallengeBackdrop /></View>
    <ContextualHeader prominent title="Reto de unidad" safeTop onBack={requestExit} disabled={state.busy} position={phase && metadata ? `${phase.position} de ${state.response?.run.totalPhases ?? metadata.challenge.phaseCount}` : undefined} />
    <ScrollView ref={chatScroll.ref} onLayout={chatScroll.onLayout} onContentSizeChange={chatScroll.onContentSizeChange} onScroll={chatScroll.onScroll} scrollEventThrottle={32} onScrollBeginDrag={chatScroll.onScrollBeginDrag} onScrollEndDrag={chatScroll.onScrollEndDrag} onMomentumScrollEnd={chatScroll.onMomentumScrollEnd} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]}>
      {state.busy && !metadata ? <ActivityIndicator color="#0062E9" accessibilityLabel="Cargando reto" /> : null}
      {state.error ? <View style={s.card}><Text accessibilityRole="alert" style={s.body}>{state.error}</Text><Button title="Reintentar" disabled={state.busy} busy={state.busy} onPress={() => { void flow.retry(); }} /></View> : null}
      {metadata ? <>
        <Text style={s.chip}>TEMA {metadata.challenge.topic.position}</Text>
        <Text style={s.title}>{complete ? result.passed ? '¡Reto aprobado!' : 'Reto no aprobado' : phase?.type === 'CONVERSATION' ? phase.content.title : metadata.challenge.title}</Text>
        {complete ? <>
          <Text style={s.body}>{metadata.challenge.title}</Text><ChallengeHero />
          <View style={[s.card, s.score]}>
            <View style={{ width: 180, height: 180, alignItems: 'center', justifyContent: 'center' }}>
              <Svg pointerEvents="none" width={180} height={180} style={{ position: 'absolute' }} accessible={false}><Circle cx={90} cy={90} r={78} fill="none" stroke="#DAEBFF" strokeWidth={13} /><Circle cx={90} cy={90} r={78} fill="none" stroke="#006FFF" strokeWidth={13} strokeDasharray={`${result.percentage / 100 * 490.09} 490.09`} rotation={-90} origin="90,90" strokeLinecap="round" /></Svg>
              <Text style={s.scoreNumber}>{result.percentage}%</Text><Text style={s.caption}>{result.correctItems}/{result.totalItems} correctas</Text>
            </View>
            <Text style={s.body}>{result.passed ? '¡Buen trabajo! Sigue aprendiendo en tu ruta.' : metadata.progress.passed || state.response?.topic?.completed ? 'Tu avance anterior se conserva. Puedes volver a intentarlo desde la ruta.' : 'Puedes volver a intentarlo desde la ruta.'}</Text>
          </View>
          <Button title="Continuar en la ruta" arrow onPress={exit} />
        </> : phase ? phase.type === 'CONVERSATION'
          ? <ConversationView onRootLayout={chatScroll.onRootLayout} onTarget={chatScroll.onTarget} onFollow={chatScroll.onFollow} key={phase.id} content={phase.content} disabled={disabled} busy={state.busy} submit={answer => { void flow.submit(answer); }} />
          : <CrosswordView key={phase.id} content={phase.content} disabled={disabled} busy={state.busy} submit={answer => { void flow.submit(answer); }} />
        : state.response?.run.status === 'ABANDONED' ? <><Text style={s.body}>Este intento fue abandonado.</Text><Button title="Volver a la ruta" onPress={exit} /></> : <>
          {metadata.challenge.description ? <Text style={s.body}>{metadata.challenge.description}</Text> : null}
          <ChallengeHero />
          <View style={s.card}><Text style={s.heading}>Qué incluye</Text><View style={s.includes}>{metadata.challenge.phaseTypes.map((type, index) => <View key={index} style={[s.tile, fontScale > 1.5 && { flexDirection: 'column' }]}>
            <View style={s.tileIcon}><PhaseIcon conversation={type === 'CONVERSATION'} /></View>
            <View style={[s.tileText, fontScale > 1.5 && { flex: 0, width: '100%' }]}><Text style={s.tileTitle}>{type === 'CONVERSATION' ? 'Conversación' : 'Crucigrama'}</Text><Text style={s.body}>{type === 'CONVERSATION' ? 'Elige cómo responder en el diálogo.' : 'Completa las palabras del tema.'}</Text></View>
          </View>)}</View></View>
          {metadata.challenge.passingScore !== null ? <Text style={s.caption}>Para aprobar: {metadata.challenge.passingScore}% de respuestas correctas.</Text> : null}
          {metadata.progress.bestScore !== null ? <Text style={s.body}>Mejor resultado: {metadata.progress.bestScore}%</Text> : null}
          {!canStart ? <Text style={s.body}>{metadata.progression.lockReason === 'PREREQUISITE' ? 'Completa los pasos anteriores de la ruta para desbloquear este reto.' : 'Este reto requiere acceso al contenido.'}</Text> : null}
          <Button title={metadata.activeRun ? 'Reanudar reto' : metadata.progress.passed ? 'Repetir reto completo' : 'Comenzar reto'} disabled={disabled || !canStart} busy={state.busy} onPress={() => { void flow.start(); }} />
          <Button title="Más tarde" tone="blue" disabled={disabled} onPress={requestExit} />
        </>}
      </> : null}
    </ScrollView>
  </KeyboardAvoidingView>;
}
