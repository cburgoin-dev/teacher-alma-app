import { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Button } from '../../courses/components/ui';
import { colors } from '../../../theme';
import type { Activity, Answer, AttemptResponse, Pair } from '../types';
import { expectedAnswer, pairSelection } from '../presentation';
import { feedbackTitle } from '../activityPresentation';
import { MatchingPairs } from './MatchingPairs';
import { LearningIcon } from './LearningIcon';
import { LessonImage } from './ContentBlocks';
import { AudioButton, DialogueRow } from './RichContent';
import { activityPresentation } from '../contentPresentation';
import { lessonStyles as s } from './lessonStyles';

export function ActivityStep({ activity, feedback, busy, onSubmit, onRetry, onContinue, onSkip, initialAnswer }: {
  activity: Activity; feedback: AttemptResponse | null; busy: boolean;
  onSubmit: (answer: Answer) => void; onRetry: () => void; onContinue: () => void; onSkip?: () => void; initialAnswer?: Answer | null;
}) {
  const { width, fontScale } = useWindowDimensions();
  const stackedActions = width < 350 || fontScale > 1.3;
  const [option, setOption] = useState<string | null>(initialAnswer && 'selectedOptionId' in initialAnswer ? initialAnswer.selectedOptionId : null);
  const [text, setText] = useState(initialAnswer && 'text' in initialAnswer ? initialAnswer.text : '');
  const [pairs, setPairs] = useState<Pair[]>(initialAnswer && 'pairs' in initialAnswer ? initialAnswer.pairs : []);
  const [hint, setHint] = useState(false);
  const [answerAgain, setAnswerAgain] = useState(false);
  const visited = !!onSkip && !answerAgain && !feedback;
  const disabled = busy || feedback !== null || visited;
  const fill = activity.type === 'FILL_BLANK_OPTIONS' || activity.type === 'FILL_BLANK_TEXT';
  const matching = activity.type === 'MATCH_WORD_IMAGE';
  const presentation = activityPresentation(activity);
  const answer: Answer | null = 'options' in activity ? option ? { selectedOptionId: option } : null
    : activity.type === 'FILL_BLANK_TEXT' ? text.trim() ? { text } : null
    : pairs.length === activity.words.length ? { pairs } : null;
  return <View style={local.activity}>
    <View style={local.heading}><LearningIcon kind={fill ? 'pencil' : matching ? 'matching' : 'chat'} /><View style={{ flex: 1 }}>
      <Text style={local.title}>{presentation.title}</Text>
      <Text style={[s.body, { marginTop: 6 }]}>{presentation.instruction}</Text>
    </View></View>
    <View style={local.exercise}>
    {activity.context ? <View style={local.context}>
      {activity.context.type === 'DIALOGUE' ? <DialogueRow turn={activity.context} />
        : activity.context.type === 'TEXT' ? <View style={local.contextText}><Text style={[s.body, { flex: 1 }]}>{activity.context.text}</Text><AudioButton {...activity.context} /></View>
          : <><LessonImage url={activity.context.url} alt={activity.context.alt} />{activity.context.caption ? <Text style={s.caption}>{activity.context.caption}</Text> : null}</>}
    </View> : null}
    {presentation.showPrompt ? !matching ? <View style={[local.prompt, !fill && { backgroundColor: colors.pale }]}><Text style={[s.heading, fill && local.sentence]}>{activity.prompt}</Text></View> : <Text style={s.body}>{activity.prompt}</Text> : null}
    {'options' in activity ? <View style={fill ? local.bank : { gap: 10 }}>{activity.options.map(item => <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ selected: option === item.id, disabled }} disabled={disabled}
      onPress={() => setOption(item.id)} style={[local.option, fill ? { flexGrow: 1, flexBasis: 92 * Math.min(fontScale, 1.5), paddingHorizontal: 10 } : local.choice, option === item.id && local.selected]}>
      {!fill ? <View style={[local.radio, option === item.id && { borderColor: colors.blue }]}>{option === item.id ? <View style={local.radioDot} /> : null}</View> : null}
      <Text style={[s.body, { flexShrink: 1, fontSize: 17, lineHeight: 24, color: option === item.id ? colors.blue : colors.ink, textAlign: fill ? 'center' : 'left', fontWeight: option === item.id ? '700' : '500' }]}>{item.text}</Text>
    </Pressable>)}</View> : null}
    {activity.type === 'FILL_BLANK_TEXT' ? <TextInput accessibilityLabel="Escribe tu respuesta" placeholder="Escribe tu respuesta"
      placeholderTextColor={colors.muted} value={text} onChangeText={setText} editable={!disabled} autoCapitalize="none" autoCorrect={false}
      style={[local.option, s.body, { color: colors.ink, minHeight: 68, fontSize: 19, textAlign: 'center', borderColor: text ? colors.blue : colors.border }]} returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} /> : null}
    {matching ? <MatchingPairs activity={activity} pairs={pairs} feedback={feedback} disabled={disabled} onPair={(word, image) => setPairs(pairSelection(pairs, word, image))} /> : null}
    {hint && activity.hint && !feedback && !visited ? <Text accessibilityLiveRegion="polite" style={[s.body, local.hint]}>{activity.hint}</Text> : null}
    </View>
    {visited ? <><Button title="Continuar" arrow busy={busy} onPress={onSkip!} /><Pressable disabled={busy} onPress={() => setAnswerAgain(true)} accessibilityRole="button"><Text style={s.link}>Responder de nuevo</Text></Pressable></>
      : !feedback ? <View style={[local.actions, stackedActions && { flexDirection: 'column', alignItems: 'stretch' }]}>
        {activity.hint ? <Pressable accessibilityRole="button" accessibilityState={{ expanded: hint, disabled: busy }} disabled={busy} style={[local.hintButton, stackedActions && { maxWidth: '100%', alignSelf: 'flex-start' }]} onPress={() => setHint(!hint)}><LearningIcon kind="bulb" plain size={21} /><Text style={[s.link, { paddingVertical: 0, flexShrink: 1 }]}>{hint ? 'Ocultar pista' : 'Pista'}</Text></Pressable> : null}
        <View style={!stackedActions && { flex: 1 }}><Button title={fill ? 'Verificar' : 'Comprobar'} arrow busy={busy} disabled={!answer} onPress={() => { Keyboard.dismiss(); if (answer) onSubmit(answer); }} /></View>
      </View> : <View accessibilityLiveRegion="polite" style={[local.feedback, { backgroundColor: feedback.attempt.isCorrect ? '#EDF9F2' : '#FFF3F1', borderColor: feedback.attempt.isCorrect ? '#D8EFE2' : '#F4DDD9' }]}>
        <View style={local.contextText}><LearningIcon kind={feedback.attempt.isCorrect ? 'completion' : 'pencil'} rose={!feedback.attempt.isCorrect} /><Text style={[s.heading, { flex: 1, fontSize: 21, lineHeight: 28, color: feedback.attempt.isCorrect ? '#13874C' : '#A33C25' }]}>{feedbackTitle(feedback)}</Text></View>
        {feedback.feedback.explanation ? <Text style={s.body}>{feedback.feedback.explanation}</Text> : null}
        {!feedback.attempt.isCorrect && expectedAnswer(activity, feedback.feedback.correctAnswer) ? <Text style={s.body}>Respuesta esperada: {expectedAnswer(activity, feedback.feedback.correctAnswer)}</Text> : null}
        {feedback.review.pending ? <Text style={s.caption}>{feedback.attempt.isCorrect ? 'Lo resolviste. Conservamos el primer intento en tu puntuación y este ejercicio para reforzarlo más adelante.' : 'Guardamos este ejercicio para reforzarlo más adelante.'}</Text> : null}
        <Button title="Continuar" arrow onPress={onContinue} busy={busy} />
        {!feedback.attempt.isCorrect ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setAnswerAgain(true); onRetry(); }}><Text style={s.link}>Intentar de nuevo</Text></Pressable> : null}
      </View>}
  </View>;
}
const local = StyleSheet.create({
  activity: { gap: 22, paddingBottom: 8 },
  exercise: { gap: 18 },
  heading: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { fontSize: 27, lineHeight: 33, fontWeight: '800', color: colors.ink },
  context: { backgroundColor: '#F0F6FF', borderRadius: 18, borderWidth: 1, borderColor: '#DBE9FD', padding: 16, gap: 10 },
  contextText: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  feedback: { padding: 18, borderRadius: 20, borderWidth: 1, gap: 14 },
  prompt: { padding: 18, borderRadius: 20 }, sentence: { fontSize: 29, lineHeight: 40, textAlign: 'center', paddingVertical: 24, color: colors.ink },
  bank: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { padding: 18, minHeight: 72, justifyContent: 'center', borderRadius: 18, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white },
  choice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 14 },
  radio: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#BACBE1', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  radioDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.blue },
  selected: { borderColor: colors.blue, backgroundColor: '#E8F2FF' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  hintButton: { paddingHorizontal: 14, paddingVertical: 10, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', borderRadius: 25, backgroundColor: '#E6F1FF', maxWidth: '43%' },
  hint: { padding: 14, backgroundColor: '#EFF6FF', borderRadius: 14 },
});
