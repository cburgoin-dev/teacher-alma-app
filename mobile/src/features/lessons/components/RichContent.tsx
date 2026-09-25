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
export function DialogueRow({ turn, alternate = false, showTranslation = true }: { turn: DialogueTurn; alternate?: boolean; showTranslation?: boolean }) {
  return <View style={local.turn}>
    {turn.speakerLabel ? <View style={[local.speaker, alternate && local.rose]}><Text style={local.label}>{turn.speakerLabel}</Text></View> : null}
    <View style={local.bubble}>
      <View style={local.words}><Text style={[s.heading, local.phrase]}>{turn.text}</Text>
        {showTranslation && turn.translation ? <Text style={s.caption}>{turn.translation}</Text> : null}</View>
      <AudioButton {...turn} />
    </View>
  </View>;
}
const local = StyleSheet.create({
  key: { color: '#0062E9', fontWeight: '700' },
  turn: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#E0EAF8', backgroundColor: '#FFF' },
  speaker: { minWidth: 38, minHeight: 38, borderRadius: 22, padding: 6, backgroundColor: '#197AF3', alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0, maxWidth: '28%' },
  rose: { backgroundColor: '#F52A46' }, label: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  bubble: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFF', borderRadius: 16 },
  words: { flex: 1, gap: 3 }, phrase: { fontSize: 17, lineHeight: 24, color: '#101B4D' },
});
