import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LayoutRectangle } from 'react-native';
import type { Activity, AttemptResponse, Pair } from '../types';
import { connectionSegments, pairFeedback } from '../activityPresentation';
import { LessonImage } from './ContentBlocks';
import { lessonStyles as s } from './lessonStyles';
export function MatchingPairs({ activity, pairs, disabled, feedback, onPair }: {
  activity: Extract<Activity, { type: 'MATCH_WORD_IMAGE' }>; pairs: Pair[]; disabled: boolean;
  feedback: AttemptResponse | null; onPair: (wordId: string, imageId: string) => void;
}) {
  const [word, setWord] = useState<string | null>(null);
  const [width, setWidth] = useState(0);
  const [rects, setRects] = useState<Record<string, LayoutRectangle>>({});
  const record = (key: string, rect: LayoutRectangle) => setRects(previous => previous[key]?.y === rect.y && previous[key]?.height === rect.height ? previous : { ...previous, [key]: rect });
  const tint = (pair: Pair | undefined) => { const correct = pairFeedback(pair, feedback); return correct === true ? '#13874C' : correct === false ? '#B34436' : pair ? '#0062E9' : '#CDD8E7'; };
  const column = (width - 60) / 2;
  return <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={local.grid}>
    <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
      {width > 0 ? pairs.flatMap(pair => {
        const left = rects['w:' + pair.wordId], right = rects['i:' + pair.imageId];
        return left && right ? connectionSegments(column, left.y + left.height / 2, column + 60, right.y + right.height / 2).map((segment, i) =>
          <View key={pair.wordId + i} style={{ position: 'absolute', left: segment.x - segment.length / 2, top: segment.y - 1.5, width: segment.length, height: 3, borderRadius: 2, backgroundColor: tint(pair), transform: [{ rotate: segment.angle + 'deg' }] }} />) : [];
      }) : null}
    </View>
    <View style={local.column}>{activity.words.map(item => {
      const pair = pairs.find(p => p.wordId === item.id), correct = pairFeedback(pair, feedback);
      return <Pressable key={item.id} onLayout={e => record('w:' + item.id, e.nativeEvent.layout)} disabled={disabled}
        accessibilityRole="button" accessibilityState={{ selected: word === item.id, disabled }} accessibilityLabel={`${item.text}${pair ? ', conectada' : ''}`}
        onPress={() => setWord(item.id)} style={[local.card, (pair || word === item.id) && { borderColor: word === item.id ? '#0062E9' : tint(pair), backgroundColor: '#EDF5FF' }]}>
        <Text style={[s.heading, { textAlign: 'center' }]}>{item.text}</Text>
        {correct !== null ? <Text style={[s.caption, { color: tint(pair), textAlign: 'center' }]}>{correct ? '✓ Correcto' : '× Revisar'}</Text> : null}
        <View style={[local.anchor, { right: -7, backgroundColor: word === item.id ? '#0062E9' : tint(pair) }]} />
      </Pressable>;
    })}</View>
    <View style={local.column}>{activity.images.map(item => {
      const pair = pairs.find(p => p.imageId === item.id);
      return <Pressable key={item.id} onLayout={e => record('i:' + item.id, e.nativeEvent.layout)} disabled={disabled || !word}
        accessibilityRole="button" accessibilityState={{ disabled: disabled || !word, selected: !!pair }} accessibilityLabel={`${item.alt}${pair ? ', conectada con ' + activity.words.find(w => w.id === pair.wordId)?.text : ''}`}
        onPress={() => { if (word) { onPair(word, item.id); setWord(null); } }} style={[local.card, { padding: 5 }, pair && { borderColor: tint(pair), backgroundColor: '#EDF5FF' }]}>
        <LessonImage url={item.url} alt={item.alt} />
        <View style={[local.anchor, { left: -7, backgroundColor: tint(pair) }]} />
      </Pressable>;
    })}</View>
  </View>;
}
const local = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 60 }, column: { flex: 1, gap: 20 },
  card: { minHeight: 130, borderRadius: 17, borderWidth: 2, borderColor: '#DFEAF8', backgroundColor: '#FFF', padding: 10, justifyContent: 'center', gap: 8 },
  anchor: { position: 'absolute', top: '50%', marginTop: -7, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#FFF' },
});
