import { StyleSheet, Text, View } from 'react-native';
import { AudioButton } from './AudioButton';
export { AudioButton } from './AudioButton';
import type { DialogueTurn, Segment } from '../types';
import { textRuns } from '../contentPresentation';
import { lessonStyles as s } from './lessonStyles';

export function RichText({ text, segments }: { text?: string; segments?: Segment[] }) {
  return <Text style={s.body}>{textRuns(text, segments).map((run, i) =>
    <Text key={i} style={run.emphasis === 'KEY' && local.key}>{run.text}</Text>)}</Text>;
}
export function DialogueRow({ turn, alternate = false, showTranslation = true, contextual = false }: { contextual?: boolean; turn: DialogueTurn; alternate?: boolean; showTranslation?: boolean }) {
  return <View style={[local.turn, contextual && local.contextTurn]}>
    {turn.speakerLabel ? <View style={[local.speaker, contextual && local.contextSpeaker, alternate && local.rose]}><Text style={[local.label, contextual && local.contextLabel]}>{turn.speakerLabel}</Text></View> : null}
    <View style={[local.bubble, contextual && local.contextBubble]}>
      {contextual ? <View pointerEvents="none" accessible={false} style={local.tail} /> : null}
      <View style={[local.words, contextual && { flexGrow: 0 }]}>{turn.segments?.length ? turn.segments.map((segment, i) => <Text key={i} style={[local.phrase, { fontWeight: segment.emphasis === 'KEY' ? '700' : '500' }]}>{segment.text}</Text>) : <Text style={[s.heading, local.phrase]}>{turn.text}</Text>}
        {showTranslation && turn.translation ? <Text style={s.caption}>{turn.translation}</Text> : null}</View>
      <AudioButton {...turn} />
    </View>
  </View>;
}
const local = StyleSheet.create({
  contextTurn: { padding: 0, borderWidth: 0, backgroundColor: 'transparent', alignItems: 'center' },
  contextSpeaker: { minWidth: 50, minHeight: 50, borderRadius: 25 },
  contextLabel: { fontSize: 23, fontWeight: '800' },
  tail: { position: 'absolute', left: -5, top: 25, width: 12, height: 12, backgroundColor: '#FFF', transform: [{ rotate: '45deg' }] },
  contextBubble: { flex: 0, flexShrink: 1, paddingHorizontal: 14, paddingVertical: 16, borderRadius: 24, gap: 12 },
  key: { color: '#0062E9', fontWeight: '700' },
  turn: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#E0EAF8', backgroundColor: '#FFF' },
  speaker: { minWidth: 38, minHeight: 38, borderRadius: 22, padding: 6, backgroundColor: '#197AF3', alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0, maxWidth: '28%' },
  rose: { backgroundColor: '#F52A46' }, label: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  bubble: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFF', borderRadius: 16 },
  words: { flexGrow: 1, flexShrink: 1, gap: 3 }, phrase: { fontSize: 17, lineHeight: 24, color: '#101B4D' },
});
