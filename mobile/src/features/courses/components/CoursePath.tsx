import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { NavigationIcon } from '../../../components/NavigationIcon';
import { colors, shadows } from '../../../theme';
import type { Lesson, Roadmap } from '../types';
import { lessonLabels, lessonState } from '../presentation';
import { Button } from './ui';
import { curvedDashes, courseStops } from './pathGeometry';
import { PathScenery } from './PathScenery';

export function CoursePath({ topics, onLessonPress }: {
  topics: Roadmap['topics']; onLessonPress: (lesson: Lesson) => void;
}) {
  const [width, setWidth] = useState(0);
  const { fontScale } = useWindowDimensions();
  const entries = useMemo(() => topics.flatMap((topic, topicIndex) => topic.lessons.map((lesson, index) => ({ lesson, topic, topicIndex, sectionStart: index === 0 }))), [topics]);
  const expanded = entries.map(({ lesson }) => lessonState(lesson) === 'CURRENT' || (lesson.progression.isCurrent && lessonState(lesson) === 'LOCKED_ACCESS'));
  const stops = courseStops(width, expanded, entries.map(entry => entry.sectionStart), fontScale);
  const dots = stops.slice(0, -1).flatMap((stop, index) => curvedDashes(stop, stops[index + 1], entries[index + 1].sectionStart));
  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    {width > 0 ? <>
      <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
        {dots.map((dot, index) => <View key={index} style={[s.dash, { left: dot.x - 3.5, top: dot.y - 1.8, transform: [{ rotate: dot.angle + 'deg' }] }]} />)}
      </View>
      {entries.map(({ lesson, topic, topicIndex, sectionStart }, index) => {
        const stop = stops[index];
        const state = lessonState(lesson);
        const current = state === 'CURRENT';
        const paid = state === 'LOCKED_ACCESS';
        const locked = paid || state === 'LOCKED_PREREQUISITE';
        const fill = current ? colors.red : paid ? '#E9B64A' : locked ? '#A6AFBD' : state === 'AVAILABLE' ? '#147DE1' : '#159653';
        const ring = current ? '#FFD3DE' : paid ? '#FFF0CD' : locked ? '#EDF0F4' : state === 'COMPLETED' ? '#D3F4DF' : '#DDEFFF';
        const radius = stop.size / 2;
        const labelLeft = stop.right ? 4 : stop.x + radius + 12;
        const labelWidth = stop.right ? stop.x - radius - 16 : width - labelLeft - 4;
        const label = lesson.title + '. ' + lessonLabels[state] + (locked && lesson.progressStatus === 'COMPLETED' ? '. Completada' : '');
        return <View key={lesson.id} style={{ height: stop.height }}>
          {index % 3 !== 1 && index < entries.length - 1 ? <PathScenery variant={index % 4} right={!stop.right} /> : null}
          {sectionStart ? <View style={[s.section, { left: labelLeft, width: labelWidth }]}>
            <Text maxFontSizeMultiplier={1.5} style={s.eyebrow}>TEMA {topicIndex + 1}</Text>
            <Text numberOfLines={2} maxFontSizeMultiplier={1.5} style={s.sectionTitle}>{topic.title}</Text>
          </View> : null}
          <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => onLessonPress(lesson)}
            style={({ pressed }) => [s.halo, { position: 'absolute', left: stop.x - radius, top: stop.y - stop.top - radius, width: stop.size, height: stop.size, borderRadius: radius, backgroundColor: ring, opacity: pressed ? .75 : 1 }]}>
            <View style={[s.disc, { backgroundColor: fill, borderColor: state === 'AVAILABLE' ? colors.blue : '#FFFFFF90' }]}>
              <View pointerEvents="none" style={s.shine} />
              {locked ? <View><View style={s.shackle} /><View style={s.lockBody}><View style={[s.keyhole, { backgroundColor: fill }]} /></View></View>
                : current ? <NavigationIcon name="CoursesTab" size={34} color="#FFF" filled />
                : state === 'COMPLETED' ? <View style={s.check} /> : <Text style={s.symbol}>›</Text>}
            </View>
            {expanded[index] ? <View style={[s.currentDot, { backgroundColor: paid ? '#D79920' : colors.red }]} /> : null}
          </Pressable>
          <View style={[s.label, { left: labelLeft, width: labelWidth, top: stop.y - stop.top - (expanded[index] ? 69 : 32) * Math.min(fontScale, 1.5), alignItems: stop.right ? 'flex-end' : 'flex-start' }, expanded[index] && s.currentCard, expanded[index] && paid && { borderColor: '#F1DFB7' }]}>
            <Text numberOfLines={2} maxFontSizeMultiplier={1.5} style={[s.title, { textAlign: stop.right ? 'right' : 'left' }]}>{index + 1}. {lesson.title}</Text>
            <Text numberOfLines={2} maxFontSizeMultiplier={1.5} style={[s.meta, { textAlign: stop.right ? 'right' : 'left' }]}>{lessonLabels[state]}</Text>
            {locked && lesson.progressStatus === 'COMPLETED' ? <Text style={s.meta}>Completada</Text> : null}
            {expanded[index] ? <View style={{ width: '100%', marginTop: 5 }}><Button compact arrow={!paid} title={paid ? 'Ver acceso' : 'Continuar'} tone={paid ? 'gold' : 'red'} onPress={() => onLessonPress(lesson)} /></View> : null}
          </View>
        </View>;
      })}
      {entries.length ? <View style={s.finish}><View style={s.finishLine} /><Text style={s.finishText}>Fin de la ruta</Text><View style={s.finishLine} /></View> : null}
    </> : null}
  </View>;
}
const s = StyleSheet.create({
  section: { position: 'absolute', top: 3, gap: 2 },
  eyebrow: { fontSize: 10, lineHeight: 14, fontWeight: '700', letterSpacing: 1, color: colors.blue },
  sectionTitle: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: colors.ink },
  finish: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 18 },
  finishLine: { height: 1, width: 30, backgroundColor: '#D6E4EF' },
  finishText: { fontSize: 13, lineHeight: 20, color: colors.muted, fontWeight: '600' },
  dash: { position: 'absolute', width: 7, height: 3.6, borderRadius: 2, backgroundColor: '#8BA4C9' },
  halo: { ...shadows.node, padding: 6, borderWidth: 1, borderColor: '#FFFFFFB0' },
  disc: { flex: 1, borderRadius: 100, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  shine: { position: 'absolute', width: '120%', height: '58%', top: -8, backgroundColor: '#FFFFFF12', borderBottomLeftRadius: 60, borderBottomRightRadius: 60 },
  symbol: { color: '#FFF', fontSize: 35, lineHeight: 42, fontWeight: '800' },
  currentDot: { position: 'absolute', top: -10, alignSelf: 'center', width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: '#FFF' },
  label: { position: 'absolute', gap: 4 },
  title: { fontSize: 16, lineHeight: 21, fontWeight: '700', color: colors.ink },
  meta: { fontSize: 12, lineHeight: 17, color: colors.muted },
  currentCard: { borderRadius: 18, borderWidth: 1.5, borderColor: '#FFC8D4', backgroundColor: '#FFF7F9', padding: 11, ...shadows.card },
  check: { width: 27, height: 16, borderLeftWidth: 5, borderBottomWidth: 5, borderColor: '#FFF', borderRadius: 2, transform: [{ rotate: '-45deg' }], marginTop: -5 },
  shackle: { width: 16, height: 15, borderWidth: 3, borderColor: '#FFF', borderTopLeftRadius: 10, borderTopRightRadius: 10, alignSelf: 'center', marginBottom: -3 },
  lockBody: { width: 25, height: 22, backgroundColor: '#FFF', borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  keyhole: { width: 4, height: 8, borderRadius: 3 },
});
