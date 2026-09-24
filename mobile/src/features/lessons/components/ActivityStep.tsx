import { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../courses/components/ui';
import { colors } from '../../../theme';
import type { Activity, Answer, AttemptResponse, Pair } from '../types';
import { expectedAnswer, pairSelection } from '../presentation';
import { feedbackTitle } from '../activityPresentation';
import { MatchingPairs } from './MatchingPairs';
import { LearningIcon } from './LearningIcon';
import { lessonStyles as s } from './lessonStyles';

export function ActivityStep({ activity, feedback, busy, onSubmit, onRetry, onContinue, onSkip, initialAnswer }: {
  activity: Activity; feedback: AttemptResponse | null; busy: boolean;
  onSubmit: (answer: Answer) => void; onRetry: () => void; onContinue: () => void; onSkip?: () => void; initialAnswer?: Answer | null;
}) {
  const [option, setOption] = useState<string | null>(initialAnswer && 'selectedOptionId' in initialAnswer ? initialAnswer.selectedOptionId : null);
  const [text, setText] = useState(initialAnswer && 'text' in initialAnswer ? initialAnswer.text : '');
  const [pairs, setPairs] = useState<Pair[]>(initialAnswer && 'pairs' in initialAnswer ? initialAnswer.pairs : []);
  const [hint, setHint] = useState(false);
  const [answerAgain, setAnswerAgain] = useState(false);
  const visited = !!onSkip && !answerAgain && !feedback;
  const disabled = busy || feedback !== null || visited;
  const fill = activity.type === 'FILL_BLANK_OPTIONS' || activity.type === 'FILL_BLANK_TEXT';
  const matching = activity.type === 'MATCH_WORD_IMAGE';
  const answer: Answer | null = 'options' in activity ? option ? { selectedOptionId: option } : null
    : activity.type === 'FILL_BLANK_TEXT' ? text.trim() ? { text } : null
    : pairs.length === activity.words.length ? { pairs } : null;
  return <>
    <View style={local.heading}><LearningIcon kind={fill ? 'pencil' : matching ? 'bulb' : 'chat'} /><View style={{ flex: 1 }}>
      <Text style={s.heading}>{fill ? 'Completa la oración' : matching ? 'Relaciona las palabras' : '¿Qué responderías?'}</Text>
      <Text style={s.caption}>{fill ? activity.type === 'FILL_BLANK_TEXT' ? 'Escribe la palabra que falta.' : 'Elige la palabra que falta.' : matching ? 'Toca una palabra y después una imagen.' : 'Elige la mejor respuesta.'}</Text>
    </View></View>
    {!matching ? <View style={[local.prompt, !fill && { backgroundColor: colors.pale }]}><Text style={[s.heading, fill && local.sentence]}>{activity.prompt}</Text></View> : <Text style={s.body}>{activity.prompt}</Text>}
    {'options' in activity ? <View style={fill ? local.bank : { gap: 10 }}>{activity.options.map(item => <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ selected: option === item.id, disabled }} disabled={disabled}
      onPress={() => setOption(item.id)} style={[local.option, fill && { flexGrow: 1, minWidth: 80 }, option === item.id && local.selected]}>
      <Text style={[s.body, { color: option === item.id ? colors.blue : colors.ink, textAlign: fill ? 'center' : 'left', fontWeight: option === item.id ? '700' : '500' }]}>{fill ? '' : option === item.id ? '●  ' : '○  '}{item.text}</Text>
    </Pressable>)}</View> : null}
    {activity.type === 'FILL_BLANK_TEXT' ? <TextInput accessibilityLabel="Escribe tu respuesta" placeholder="Escribe tu respuesta"
      placeholderTextColor={colors.muted} value={text} onChangeText={setText} editable={!disabled} autoCapitalize="none" autoCorrect={false}
      style={[local.option, s.body, { color: colors.ink, minHeight: 58, textAlign: 'center' }]} returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} /> : null}
    {matching ? <MatchingPairs activity={activity} pairs={pairs} feedback={feedback} disabled={disabled} onPair={(word, image) => setPairs(pairSelection(pairs, word, image))} /> : null}
    {hint && activity.hint && !feedback && !visited ? <Text accessibilityLiveRegion="polite" style={[s.body, local.hint]}>{activity.hint}</Text> : null}
    {visited ? <><Button title="Continuar" arrow disabled={busy} onPress={onSkip!} /><Pressable disabled={busy} onPress={() => setAnswerAgain(true)} accessibilityRole="button"><Text style={s.link}>Responder de nuevo</Text></Pressable></>
      : !feedback ? <View style={local.actions}>
        {activity.hint ? <Pressable accessibilityRole="button" accessibilityState={{ expanded: hint, disabled: busy }} disabled={busy} style={local.hintButton} onPress={() => setHint(!hint)}><Text style={[s.link, { paddingVertical: 0 }]}>{hint ? 'Ocultar pista' : 'Pista'}</Text></Pressable> : null}
        <View style={{ flex: 1 }}><Button title={fill ? 'Verificar' : 'Comprobar'} arrow busy={busy} disabled={!answer} onPress={() => { Keyboard.dismiss(); if (answer) onSubmit(answer); }} /></View>
      </View> : <View accessibilityLiveRegion="polite" style={[s.card, { backgroundColor: feedback.attempt.isCorrect ? '#EDF9F2' : '#FFF3F1' }]}>
        <Text style={[s.heading, { color: feedback.attempt.isCorrect ? '#13874C' : '#A33C25' }]}>{feedback.attempt.isCorrect ? '✓ ' : ''}{feedbackTitle(feedback)}</Text>
        {feedback.feedback.explanation ? <Text style={s.body}>{feedback.feedback.explanation}</Text> : null}
        {!feedback.attempt.isCorrect && expectedAnswer(activity, feedback.feedback.correctAnswer) ? <Text style={s.body}>Respuesta esperada: {expectedAnswer(activity, feedback.feedback.correctAnswer)}</Text> : null}
        {feedback.review.pending ? <Text style={s.caption}>{feedback.attempt.isCorrect ? 'Lo resolviste. Conservamos el primer intento en tu puntuación y este ejercicio para reforzarlo más adelante.' : 'Guardamos este ejercicio para reforzarlo más adelante.'}</Text> : null}
        <Button title="Continuar" arrow onPress={onContinue} disabled={busy} />
        {!feedback.attempt.isCorrect ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setAnswerAgain(true); onRetry(); }}><Text style={s.link}>Intentar de nuevo</Text></Pressable> : null}
      </View>}
  </>;
}
const local = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  prompt: { padding: 18, borderRadius: 18 }, sentence: { fontSize: 25, lineHeight: 34, textAlign: 'center', paddingVertical: 12 },
  bank: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { padding: 16, minHeight: 54, borderRadius: 16, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.white },
  selected: { borderColor: colors.blue, backgroundColor: '#E8F2FF' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  hintButton: { paddingHorizontal: 16, minHeight: 48, justifyContent: 'center', borderRadius: 25, backgroundColor: '#E6F1FF', maxWidth: '40%' },
  hint: { padding: 14, backgroundColor: '#EFF6FF', borderRadius: 14 },
});
