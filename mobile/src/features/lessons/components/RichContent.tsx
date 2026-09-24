import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Volume2 from 'lucide-react-native/icons/volume-2';
import type { AudioMetadata, DialogueTurn, Segment } from '../types';
import { mediaUrl, textRuns } from '../contentPresentation';
import { lessonStyles as s } from './lessonStyles';

export function RichText({ text, segments }: { text?: string; segments?: Segment[] }) {
  return <Text style={s.body}>{textRuns(text, segments).map((run, i) =>
    <Text key={i} style={run.emphasis === 'KEY' && local.key}>{run.text}</Text>)}</Text>;
}
export function AudioButton({ audioUrl, audioAlt }: AudioMetadata) {
  const url = mediaUrl(audioUrl);
  if (!url) return null;
  return <Pressable accessibilityRole="link" accessibilityLabel={audioAlt ? `Abrir audio: ${audioAlt}` : 'Abrir audio'}
    accessibilityHint="Abre el audio en una aplicación externa" style={({ pressed }) => [local.audio, { opacity: pressed ? .65 : 1 }]}
    onPress={() => { void Linking.openURL(url).catch(() => Alert.alert('No pudimos abrir el audio', 'Inténtalo de nuevo más tarde.')); }}>
    <Volume2 color="#0062E9" size={24} strokeWidth={2.5} />
  </Pressable>;
}
export function DialogueRow({ turn, alternate = false, showTranslation = true }: { turn: DialogueTurn; alternate?: boolean; showTranslation?: boolean }) {
  return <View style={local.row}>
    {turn.speakerLabel ? <View style={[local.speaker, alternate && local.rose]}><Text style={local.label}>{turn.speakerLabel}</Text></View> : null}
    <View style={local.bubble}>
      {turn.speakerLabel ? <View pointerEvents="none" style={local.tail} /> : null}
      <View style={local.words}><Text style={[s.heading, local.phrase]}>{turn.text}</Text>
        {showTranslation && turn.translation ? <Text style={s.caption}>{turn.translation}</Text> : null}</View>
      <AudioButton {...turn} />
    </View>
  </View>;
}
const local = StyleSheet.create({
  key: { color: '#0062E9', fontWeight: '700' },
  audio: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E8F2FF', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  speaker: { minWidth: 38, minHeight: 38, borderRadius: 22, padding: 8, backgroundColor: '#197AF3', alignItems: 'center', justifyContent: 'center', marginTop: 10, flexShrink: 0, maxWidth: '28%' },
  rose: { backgroundColor: '#F52A46' }, label: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  bubble: { flexShrink: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFF', padding: 14, borderRadius: 22 },
  tail: { position: 'absolute', left: -5, top: 24, width: 12, height: 12, backgroundColor: '#FFF', transform: [{ rotate: '45deg' }] },
  words: { flexShrink: 1, gap: 5 }, phrase: { fontSize: 17, lineHeight: 24, color: '#101B4D' },
});
