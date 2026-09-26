import { useEffect, useReducer, useRef, useState } from 'react';
import { Keyboard, ScrollView, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Button } from '../../courses/components/ui';
import { colors } from '../../../theme';
import type { Activity, Answer, ActivityFeedback } from '../types';
import { expectedAnswer } from '../presentation';
import { FILL_MAX_LENGTH, fillParts, blankColor, feedbackScrollTarget } from '../fillPresentation';
import { matchingDraft } from '../matchingDraft';
import { feedbackCorrect, reinforcementOnCompletion, feedbackTitle } from '../activityPresentation';
import { MatchingPairs } from './MatchingPairs';
import { LearningIcon } from './LearningIcon';
import { LessonImage } from './ContentBlocks';
import { AudioButton, DialogueRow } from './RichContent';
import { activityPresentation } from '../contentPresentation';
import { lessonStyles as s } from './lessonStyles';

export function ActivityStep({ activity, feedback, busy, onSubmit, onRetry, onContinue, initialAnswer, onAnswerChange, bottomInset = 0, error }: {
  bottomInset?: number; error?: string;
  activity: Activity; feedback: ActivityFeedback | null; busy: boolean;
  onSubmit: (answer: Answer) => void; onRetry: () => void; onContinue: () => void; initialAnswer?: Answer | null; onAnswerChange?: (answer: Answer) => void;
}) {
  const { width, fontScale } = useWindowDimensions();
  const scroll = useRef<ScrollView>(null);
  const input = useRef<TextInput>(null);
  const viewport = useRef(0);
  const scrollY = useRef(0);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) return;
    let frame: number | undefined;
    const reveal = () => {
      input.current?.measureInWindow((_x, inputY, _w, inputHeight) => {
        scroll.current?.getNativeScrollRef()?.measureInWindow((_sx, bodyY, _sw, bodyHeight) => {
          const overflow = inputY + inputHeight + 12 - (bodyY + bodyHeight);
          if (overflow > 0) scroll.current?.scrollTo({ y: scrollY.current + overflow, animated: true });
        });
      });
    };
    const subscription = Keyboard.addListener('keyboardDidShow', () => { frame = requestAnimationFrame(reveal); });
    reveal();
    return () => { subscription.remove(); if (frame !== undefined) cancelAnimationFrame(frame); };
  }, [focused]);
  const stackedActions = width < 350 || fontScale > 1.3;
  const [option, setOption] = useState<string | null>(initialAnswer && 'selectedOptionId' in initialAnswer ? initialAnswer.selectedOptionId : null);
  const [text, setText] = useState(initialAnswer && 'text' in initialAnswer ? initialAnswer.text : '');
  const [draft, dispatch] = useReducer(matchingDraft, { pairs: initialAnswer && 'pairs' in initialAnswer ? initialAnswer.pairs : [], word: null, image: null });
  const { pairs } = draft;
  const [hint, setHint] = useState(false);
  const disabled = busy || feedback !== null;
  const fill = activity.type === 'FILL_BLANK_OPTIONS' || activity.type === 'FILL_BLANK_TEXT';
  const matching = activity.type === 'MATCH_WORD_IMAGE';
  const presentation = activityPresentation(activity);
  const blank = fill ? fillParts(activity.prompt) : null;
  const fillValue = activity.type === 'FILL_BLANK_OPTIONS' ? activity.options.find(item => item.id === option)?.text ?? '' : text;
  const fillColor = blankColor(!!fillValue, focused, feedback ? feedbackCorrect(feedback) : null);
  const correctAnswer = feedback ? expectedAnswer(activity, feedback.feedback.correctAnswer) : '';
  const matchingCorrection = matching && feedback && !feedbackCorrect(feedback) && correctAnswer;
  const answer: Answer | null = 'options' in activity ? option ? { selectedOptionId: option } : null
    : activity.type === 'FILL_BLANK_TEXT' ? text.trim() ? { text } : null
    : pairs.length === activity.words.length ? { pairs } : null;
  return <View style={local.activity}>
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
      onLayout={event => { viewport.current = event.nativeEvent.layout.height; }}
      onScroll={event => { scrollY.current = event.nativeEvent.contentOffset.y; }} scrollEventThrottle={16}
      contentContainerStyle={local.body}>
    {error ? <Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text> : null}
    <View style={local.heading}><LearningIcon kind={fill ? 'pencil' : matching ? 'matching' : 'chat'} /><View style={{ flex: 1 }}>
      <Text style={local.title}>{presentation.title}</Text>
      <Text style={[s.body, { marginTop: 6 }]}>{presentation.instruction}</Text>
    </View></View>
    <View style={local.exercise}>
    {activity.context ? <View style={[local.context, activity.context.type === 'DIALOGUE' && local.dialogueContext, activity.type === 'FILL_BLANK_TEXT' && activity.context.type === 'IMAGE' && local.compactContext]}>
      {activity.context.type === 'DIALOGUE' ? <DialogueRow turn={activity.context} contextual />
        : activity.context.type === 'TEXT' ? <View style={local.contextText}><Text style={[s.body, { flex: 1 }]}>{activity.context.text}</Text><AudioButton {...activity.context} /></View>
          : <><LessonImage wide url={activity.context.url} alt={activity.context.alt} />{activity.context.caption ? <Text style={s.caption}>{activity.context.caption}</Text> : null}</>}
    </View> : null}
    {blank ? activity.type === 'FILL_BLANK_TEXT' ? <View style={local.inlineSentence}>
      {blank.before ? <Text style={[local.sentence, { paddingVertical: 0 }]}>{blank.before}</Text> : null}
      <TextInput ref={input} accessibilityLabel={activity.prompt + ' Escribe la palabra que falta'} maxLength={FILL_MAX_LENGTH} underlineColorAndroid="transparent" onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        value={text} onChangeText={value => { const bounded = value.replace(/[\r\n]/g, " ").slice(0, FILL_MAX_LENGTH); setText(bounded); onAnswerChange?.({ text: bounded }); }} editable={!disabled}
        autoCapitalize="none" autoCorrect={false} multiline={false} scrollEnabled
        style={[local.inlineInput, { color: fillColor, borderColor: fillColor, width: Math.min(80 * fontScale, (width - 40) * .55) }]}
        returnKeyType="done" blurOnSubmit onSubmitEditing={() => Keyboard.dismiss()} />
      {blank.after ? <Text style={[local.sentence, { paddingVertical: 0 }]}>{blank.after}</Text> : null}
    </View> : <View style={local.inlineSentence}><Text style={[local.sentence, { paddingVertical: 0 }]}>{blank.before}</Text><View style={{ borderBottomWidth: 2, borderColor: fillColor, minWidth: 64, maxWidth: "100%" }}><Text style={[local.sentence, { paddingVertical: 0, color: fillColor }]}>{fillValue || " "}</Text></View><Text style={[local.sentence, { paddingVertical: 0 }]}>{blank.after}</Text></View> : null}
    {!blank && presentation.showPrompt ? !matching ? <View style={[local.prompt, !fill && { backgroundColor: colors.pale }]}><Text style={[s.heading, fill && local.sentence]}>{activity.prompt}</Text></View> : <Text style={s.body}>{activity.prompt}</Text> : null}
    {'options' in activity ? <View style={fill ? local.bank : { gap: 10 }}>{activity.options.map(item => <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ selected: option === item.id, disabled }} disabled={disabled}
      onPress={() => { setOption(item.id); onAnswerChange?.({ selectedOptionId: item.id }); }} style={[local.option, fill ? { flexGrow: 1, flexBasis: 92 * Math.min(fontScale, 1.5), paddingHorizontal: 10 } : local.choice, option === item.id && local.selected]}>
      {!fill ? <View style={[local.radio, option === item.id && { borderColor: colors.blue }]}>{option === item.id ? <View style={local.radioDot} /> : null}</View> : null}
      <Text style={[s.body, { flexShrink: 1, fontSize: 17, lineHeight: 24, color: option === item.id ? colors.blue : colors.ink, textAlign: fill ? 'center' : 'left', fontWeight: option === item.id ? '700' : '500' }]}>{item.text}</Text>
    </Pressable>)}</View> : null}
    {activity.type === 'FILL_BLANK_TEXT' && !blank ? <TextInput ref={input} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} accessibilityLabel="Escribe tu respuesta" maxLength={FILL_MAX_LENGTH} multiline={false} underlineColorAndroid="transparent" placeholder="Escribe tu respuesta"
      placeholderTextColor={colors.muted} value={text} onChangeText={value => { const bounded = value.replace(/[\r\n]/g, " ").slice(0, FILL_MAX_LENGTH); setText(bounded); onAnswerChange?.({ text: bounded }); }} editable={!disabled} autoCapitalize="none" autoCorrect={false}
      style={[local.option, s.body, { color: colors.ink, minHeight: 68, fontSize: 19, textAlign: 'center', borderColor: text ? colors.blue : colors.border }]} returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} /> : null}
    {matching ? <MatchingPairs activity={activity} pairs={pairs} word={draft.word} image={draft.image} feedback={feedback} disabled={disabled} onSelect={word => { const next = matchingDraft(draft, { type: 'select', word }); dispatch({ type: 'select', word }); onAnswerChange?.({ pairs: next.pairs }); }} onConnect={image => { const next = matchingDraft(draft, { type: 'connect', image }); dispatch({ type: 'connect', image }); onAnswerChange?.({ pairs: next.pairs }); }} /> : null}
    {hint && activity.hint && !feedback ? <Text accessibilityLiveRegion="polite" style={[s.body, local.hint]}>{activity.hint}</Text> : null}
    </View>
    {feedback ? <View onLayout={event => { const target = feedbackScrollTarget(scrollY.current, viewport.current, event.nativeEvent.layout.y, event.nativeEvent.layout.height); if (target !== null) scroll.current?.scrollTo({ y: target, animated: true }); }} accessibilityLiveRegion="polite" style={[local.feedback, { backgroundColor: feedbackCorrect(feedback) ? '#EDF9F2' : '#FFF3F1', borderColor: feedbackCorrect(feedback) ? '#D8EFE2' : '#F4DDD9' }]}>
        <View style={local.contextText}><LearningIcon kind={feedbackCorrect(feedback) ? 'completion' : 'pencil'} rose={!feedbackCorrect(feedback)} /><Text style={[s.heading, { flex: 1, fontSize: 21, lineHeight: 28, color: feedbackCorrect(feedback) ? '#13874C' : '#A33C25' }]}>{feedbackTitle(feedback)}</Text></View>
        {matchingCorrection ? <Text style={s.body}>Revisa las conexiones marcadas en rojo.</Text> : feedback.feedback.explanation ? <Text style={s.body}>{feedback.feedback.explanation}</Text> : null}
        {!feedbackCorrect(feedback) && correctAnswer ? <Text style={s.body}>{matching ? 'Respuesta correcta:\n' : 'Respuesta esperada: '}{correctAnswer}</Text> : null}
        {reinforcementOnCompletion(feedback) ? <Text style={s.caption}>{'completion' in feedback && feedback.completion ? 'Guardamos este ejercicio para reforzarlo. Tu primer intento sigue contando para la precisión.' : feedbackCorrect(feedback) ? 'Lo resolviste. El primer intento cuenta para la precisión de esta sesión; al terminar guardaremos este ejercicio para reforzarlo.' : 'Al terminar la lección guardaremos este ejercicio para reforzarlo.'}</Text> : null}
        {!feedbackCorrect(feedback) ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => { if (busy) return; if (matching) dispatch({ type: 'retry' }); if (fill) { setOption(null); setText(''); } setHint(false); onRetry(); }}><Text style={s.link}>Intentar de nuevo</Text></Pressable> : null}
      </View> : null}
    </ScrollView>
    <View style={[local.footer, { paddingBottom: Math.max(12, bottomInset) }]}>
      {feedback ? <Button title="Continuar" arrow onPress={onContinue} busy={busy} /> : <View style={[local.actions, stackedActions && { flexDirection: 'column', alignItems: 'stretch' }]}>
        {activity.hint ? <Pressable accessibilityRole="button" accessibilityState={{ expanded: hint, disabled: busy }} disabled={busy} style={[local.hintButton, stackedActions && { maxWidth: '100%', alignSelf: 'flex-start' }]} onPress={() => setHint(!hint)}><LearningIcon kind="bulb" plain size={21} /><Text style={[s.link, { paddingVertical: 0, flexShrink: 1 }]}>{hint ? 'Ocultar pista' : 'Pista'}</Text></Pressable> : null}
        <View style={!stackedActions && { flex: 1 }}><Button title="Comprobar" arrow busy={busy} disabled={!answer} onPress={() => { Keyboard.dismiss(); if (answer) onSubmit(answer); }} /></View>
      </View>}
    </View>
  </View>;
}
const local = StyleSheet.create({
  activity: { flex: 1 },
  body: { gap: 18, padding: 20, paddingBottom: 24, width: '100%', maxWidth: 640, alignSelf: 'center' },
  footer: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 10, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EDF1F6' },
  exercise: { gap: 16 },
  heading: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { fontSize: 27, lineHeight: 33, fontWeight: '800', color: colors.ink },
  context: { backgroundColor: '#F0F6FF', borderRadius: 18, borderWidth: 1, borderColor: '#DBE9FD', padding: 12, gap: 8 },
  dialogueContext: { borderWidth: 0, padding: 10, backgroundColor: '#F1F7FF', borderRadius: 18, alignSelf: 'stretch' },
  compactContext: { width: '100%', maxWidth: 260, alignSelf: 'center', padding: 8 },
  contextText: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  feedback: { padding: 18, borderRadius: 20, borderWidth: 1, gap: 14 },
  prompt: { padding: 14, borderRadius: 20 }, sentence: { fontSize: 29, fontWeight: '700', lineHeight: 40, textAlign: 'center', paddingVertical: 14, color: colors.ink },
  inlineSentence: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  inlineInput: { fontSize: 29, lineHeight: 40, fontWeight: '700', borderBottomWidth: 2, padding: 4, minHeight: 48, maxWidth: '100%', textAlign: 'center' },
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
