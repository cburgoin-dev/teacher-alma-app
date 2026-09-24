import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LayoutRectangle } from 'react-native';
import type { Activity, AttemptResponse, Pair } from '../types';
import Svg, { Circle, Path } from 'react-native-svg';
import { connectionPath, pairFeedback } from '../activityPresentation';
import { LessonImage } from './ContentBlocks';
import { lessonStyles as s } from './lessonStyles';
export function MatchingPairs({ activity, pairs, disabled, feedback, onPair }: {
  activity: Extract<Activity, { type: 'MATCH_WORD_IMAGE' }>; pairs: Pair[]; disabled: boolean;
  feedback: AttemptResponse | null; onPair: (wordId: string, imageId: string) => void;
}) {
  const [word, setWord] = useState<string | null>(null);
  const [width, setWidth] = useState(0);
  const [rightX, setRightX] = useState(0);
  const [rects, setRects] = useState<Record<string, LayoutRectangle>>({});
  const record = (key: string, rect: LayoutRectangle) => setRects(previous => previous[key]?.x === rect.x && previous[key]?.width === rect.width && previous[key]?.y === rect.y && previous[key]?.height === rect.height ? previous : { ...previous, [key]: rect });
  const tint = (pair: Pair | undefined) => { const correct = pairFeedback(pair, feedback); return correct === true ? '#13874C' : correct === false ? '#B34436' : pair ? '#0062E9' : '#CDD8E7'; };
  const surface = (pair: Pair | undefined) => pairFeedback(pair, feedback) === true ? '#EFFAF4' : pairFeedback(pair, feedback) === false ? '#FFF2EF' : '#EDF5FF';
  return <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={local.grid}>
    <View style={local.column}>{activity.words.map(item => {
      const pair = pairs.find(p => p.wordId === item.id), correct = pairFeedback(pair, feedback);
      return <Pressable key={item.id} onLayout={e => record('w:' + item.id, e.nativeEvent.layout)} disabled={disabled}
        accessibilityRole="button" accessibilityState={{ selected: word === item.id, disabled }} accessibilityLabel={`${item.text}${pair ? ', conectada' : ''}`}
        onPress={() => setWord(item.id)} style={[local.card, (pair || word === item.id) && { borderColor: word === item.id ? '#0062E9' : tint(pair), backgroundColor: surface(pair) }]}>
        <Text style={[s.heading, { textAlign: 'center' }]}>{item.text}</Text>
        {correct !== null ? <Text style={[s.caption, { color: tint(pair), textAlign: 'center' }]}>{correct ? '✓ Correcto' : '× Revisar'}</Text> : null}
      </Pressable>;
    })}</View>
    <View style={local.column} onLayout={e => setRightX(e.nativeEvent.layout.x)}>{activity.images.map(item => {
      const pair = pairs.find(p => p.imageId === item.id);
      return <Pressable key={item.id} onLayout={e => record('i:' + item.id, e.nativeEvent.layout)} disabled={disabled || !word}
        accessibilityRole="button" accessibilityState={{ disabled: disabled || !word, selected: !!pair }} accessibilityLabel={`${item.alt}${pair ? ', conectada con ' + activity.words.find(w => w.id === pair.wordId)?.text : ''}`}
        onPress={() => { if (word) { onPair(word, item.id); setWord(null); } }} style={[local.card, { padding: 6 }, pair && { borderColor: tint(pair), backgroundColor: surface(pair) }]}>
        <LessonImage url={item.url} alt={item.alt} />
      </Pressable>;
    })}</View>
    <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        {width > 0 && rightX > 0 ? pairs.map(pair => {
          const left = rects['w:' + pair.wordId], right = rects['i:' + pair.imageId];
          return left && right && rightX > 0 ? <Path key={pair.wordId} d={connectionPath(left.x + left.width, left.y + left.height / 2, rightX + right.x, right.y + right.height / 2)} fill="none" stroke={tint(pair)} strokeWidth={3} strokeLinecap="round" /> : null;
        }) : null}
        {width > 0 && rightX > 0 ? Object.entries(rects).map(([key, rect]) => {
          const left = key.startsWith('w:');
          const id = key.slice(2);
          const pair = pairs.find(p => left ? p.wordId === id : p.imageId === id);
          return <Circle key={key} cx={left ? rect.x + rect.width : rightX + rect.x} cy={rect.y + rect.height / 2} r={7} fill={left && word === id ? '#0062E9' : tint(pair)} stroke="#FFF" strokeWidth={2} />;
        }) : null}
      </Svg>
    </View>
  </View>;
}
const local = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 48 }, column: { flex: 1, gap: 16 },
  card: { minHeight: 112, borderRadius: 17, borderWidth: 1.5, borderColor: '#DFEAF8', backgroundColor: '#FFF', padding: 10, justifyContent: 'center', gap: 8 },
});
