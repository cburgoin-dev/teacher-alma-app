import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { NavigationIcon } from '../../../components/NavigationIcon';
import { colors, shadows } from '../../../theme';
import type { Lesson } from '../types';
import { lessonLabels, lessonState } from '../presentation';
import { Button } from './ui';
import { curvedDashes, serpentineStops } from './pathGeometry';

export function TopicPath({ lessons, startIndex, onLessonPress }: {
  lessons: Lesson[]; startIndex: number; onLessonPress: (lesson: Lesson) => void;
}) {
  const [width, setWidth] = useState(0);
  const { fontScale } = useWindowDimensions();
  const expanded = lessons.map(lesson => lessonState(lesson) === 'CURRENT' || (lesson.progression.isCurrent && lessonState(lesson) === 'LOCKED_ACCESS'));
  const stops = serpentineStops(width, expanded, startIndex, fontScale);
  const dots = useMemo(() => stops.slice(0, -1).flatMap((stop, index) => curvedDashes(stop, stops[index + 1])), [width, fontScale, lessons, startIndex]);
  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    {width > 0 ? <>
      <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
        {dots.map((dot, index) => <View key={index} style={[s.dash, { left: dot.x - 3.5, top: dot.y - 1.8, transform: [{ rotate: dot.angle + 'deg' }] }]} />)}
      </View>
      {lessons.map((lesson, index) => {
        const stop = stops[index];
        const state = lessonState(lesson);
        const current = state === 'CURRENT';
        const paid = state === 'LOCKED_ACCESS';
        const locked = paid || state === 'LOCKED_PREREQUISITE';
        const fill = current ? colors.red : paid ? '#EDB94C' : locked ? '#8EA3C1' : state === 'AVAILABLE' ? '#FFF' : '#087FFF';
        const ring = current ? '#FFE0E6' : paid ? '#FFF0CD' : locked ? '#E6EDF6' : '#DDEFFF';
        const radius = stop.size / 2;
        const labelLeft = stop.right ? 4 : stop.x + radius + 12;
        const labelWidth = stop.right ? stop.x - radius - 16 : width - labelLeft - 4;
        const label = lesson.title + '. ' + lessonLabels[state] + (locked && lesson.progressStatus === 'COMPLETED' ? '. Completada' : '');
        return <View key={lesson.id} style={{ height: stop.height }}>
          <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => onLessonPress(lesson)}
            style={({ pressed }) => [s.halo, { position: 'absolute', left: stop.x - radius, top: stop.y - stop.top - radius, width: stop.size, height: stop.size, borderRadius: radius, backgroundColor: ring, opacity: pressed ? .75 : 1 }]}>
            <View style={[s.disc, { backgroundColor: fill, borderColor: state === 'AVAILABLE' ? colors.blue : '#FFFFFF90' }]}>
              <View pointerEvents="none" style={s.shine} />
              {locked ? <View><View style={s.shackle} /><View style={s.lockBody}><View style={[s.keyhole, { backgroundColor: fill }]} /></View></View>
                : current ? <NavigationIcon name="CoursesTab" size={34} color="#FFF" filled />
                : <Text style={[s.symbol, state === 'AVAILABLE' && { color: colors.blue }]}>{state === 'COMPLETED' ? '✓' : '›'}</Text>}
            </View>
            {expanded[index] ? <View style={[s.currentDot, { backgroundColor: paid ? '#D79920' : colors.red }]} /> : null}
          </Pressable>
          <View style={[s.label, { left: labelLeft, width: labelWidth, top: stop.y - stop.top - (expanded[index] ? 69 : 32) * Math.min(fontScale, 1.5), alignItems: stop.right ? 'flex-end' : 'flex-start' }, expanded[index] && s.currentCard, expanded[index] && paid && { borderColor: '#F1DFB7' }]}>
            <Text numberOfLines={2} maxFontSizeMultiplier={1.5} style={[s.title, { textAlign: stop.right ? 'right' : 'left' }]}>{startIndex + index + 1}. {lesson.title}</Text>
            <Text numberOfLines={2} maxFontSizeMultiplier={1.5} style={[s.meta, { textAlign: stop.right ? 'right' : 'left' }]}>{lessonLabels[state]}</Text>
            {locked && lesson.progressStatus === 'COMPLETED' ? <Text style={s.meta}>Completada</Text> : null}
            {expanded[index] ? <View style={{ width: '100%', marginTop: 5 }}><Button compact title={paid ? 'Ver acceso' : 'Continuar →'} tone={paid ? 'gold' : 'red'} onPress={() => onLessonPress(lesson)} /></View> : null}
          </View>
        </View>;
      })}
    </> : null}
  </View>;
}
const s = StyleSheet.create({
  dash: { position: 'absolute', width: 7, height: 3.6, borderRadius: 2, backgroundColor: '#8BA4C9' },
  halo: { ...shadows.node, padding: 6, borderWidth: 1, borderColor: '#FFFFFFB0' },
  disc: { flex: 1, borderRadius: 100, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  shine: { position: 'absolute', width: '120%', height: '58%', top: -8, backgroundColor: '#FFFFFF12', borderBottomLeftRadius: 60, borderBottomRightRadius: 60 },
  symbol: { color: '#FFF', fontSize: 35, lineHeight: 42, fontWeight: '800' },
  currentDot: { position: 'absolute', top: -10, alignSelf: 'center', width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: '#FFF' },
  label: { position: 'absolute', gap: 4 },
  title: { fontSize: 16, lineHeight: 21, fontWeight: '700', color: colors.ink },
  meta: { fontSize: 12, lineHeight: 17, color: colors.muted },
  currentCard: { borderRadius: 18, borderWidth: 1, borderColor: '#FFDEE5', backgroundColor: '#FFFFFFF5', padding: 11, ...shadows.card },
  shackle: { width: 16, height: 15, borderWidth: 3, borderColor: '#FFF', borderTopLeftRadius: 10, borderTopRightRadius: 10, alignSelf: 'center', marginBottom: -3 },
  lockBody: { width: 25, height: 22, backgroundColor: '#FFF', borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  keyhole: { width: 4, height: 8, borderRadius: 3 },
});
