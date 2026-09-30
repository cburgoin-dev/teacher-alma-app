import { vehiclePosition, vehicleOrigin, vehicleAngle } from './vehicleGeometry';
import { TravelBus } from './TravelBus';
import { CompletionDrawing } from './CompletionDrawing';
import { changesFacing, revealStages } from './nodeMotion';
import { TRAVEL_END } from '../completionMotion';
import type { ProgressTransition } from '../completionMotion';
import { useProgressMotion } from './useProgressMotion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { NavigationIcon } from '../../../components/NavigationIcon';
import { colors, shadows } from '../../../theme';
import type { Lesson, Roadmap } from '../types';
import { lessonLabels, lessonState } from '../presentation';
import { Button } from './ui';
import { busStops, travelSamples, travelPoint, curvedDashes, courseStops } from './pathGeometry';
import { PathScenery } from './PathScenery';
import { RouteBus, Trophy } from '../../unit-challenges/ChallengeArt';

export function CoursePath({ topics, onLessonPress, targetId, onTargetLayout, currentNodeId, transition = null, motionReady = false, onMotionEnd, onMotionPosition }: {
  topics: Roadmap['topics']; onLessonPress: (lesson: Lesson) => void;
  targetId?: string | null; onTargetLayout?: (id: string, y: number, range?: { top: number; bottom: number }) => void;
  currentNodeId?: string | null;
  transition?: ProgressTransition | null; motionReady?: boolean; onMotionEnd: () => void; onMotionPosition?: (y: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const { fontScale } = useWindowDimensions();
  const entries = useMemo(() => topics.flatMap((topic, topicIndex) => topic.nodes.map((lesson, index) => ({ lesson, topic, topicIndex, sectionStart: index === 0 }))), [topics]);
  const expanded = entries.map(({ lesson }) => lessonState(lesson) === 'CURRENT' || (lesson.progression.isCurrent && lessonState(lesson) === 'LOCKED_ACCESS'));
  const stops = courseStops(width, expanded, entries.map(entry => entry.sectionStart), fontScale);
  const fromIndex = entries.findIndex(entry => entry.lesson.id === transition?.from);
  const toIndex = entries.findIndex(entry => entry.lesson.id === transition?.to);
  const moving = !!transition && fromIndex >= 0 && toIndex >= 0;
  const targetY = moving ? stops[fromIndex].y - stops[fromIndex].size / 2 - 2 : stops[entries.findIndex(entry => entry.lesson.id === targetId)]?.y;
  const samples = useMemo(() => moving ? travelSamples(busStops(stops[fromIndex], stops[toIndex], entries[toIndex].sectionStart)) : [], [width, fontScale, entries, transition]);
  const follow = useCallback((value: number) => {
    if (samples.length) onMotionPosition?.(travelPoint(samples, Math.min(1, value / TRAVEL_END)).y);
  }, [samples, onMotionPosition]);
  const { progress, completion, reveal, orientation, animate } = useProgressMotion(transition, motionReady, onMotionEnd, follow);
  const facingLeft = moving && stops[toIndex].x < stops[fromIndex].x;
  const turn = changesFacing(false, facingLeft);
  const facingMix = Animated.multiply(orientation, progress.interpolate({ inputRange: [0, TRAVEL_END, 1], outputRange: [1, 1, 0] }));
  const inputRange = samples.map(p => p.fraction * TRAVEL_END).concat(1);
  const busX = moving ? progress.interpolate({ inputRange, outputRange: samples.map(p => vehiclePosition(p).x).concat(vehiclePosition(samples.at(-1)!).x) }) : 0;
  const busY = moving ? progress.interpolate({ inputRange, outputRange: samples.map(p => vehiclePosition(p).y).concat(vehiclePosition(samples.at(-1)!).y) }) : 0;
  const rotation = moving ? progress.interpolate({ inputRange, outputRange: samples.map((p, i) => (i ? vehicleAngle(p.angle, facingLeft) : 0) + 'deg').concat('0deg') }) : '0deg';
  const arrivalScale = progress.interpolate({ inputRange: [0, TRAVEL_END, (TRAVEL_END + 1) / 2, 1], outputRange: [1, 1, 1.06, 1] });
  const oldCompletionOpacity = completion.interpolate({ inputRange: [0, .65, 1], outputRange: [1, 0, 0] });
  const channel = (range: readonly [number, number]) => reveal.interpolate({ inputRange: [...range], outputRange: [0, 1], extrapolate: 'clamp' });
  const oldDestinationOpacity = reveal.interpolate({ inputRange: [...revealStages.ring], outputRange: [1, 0], extrapolate: 'clamp' });
  const oldLockOpacity = reveal.interpolate({ inputRange: [...revealStages.lock], outputRange: [1, 0], extrapolate: 'clamp' });
  const oldLockScale = reveal.interpolate({ inputRange: [...revealStages.lock], outputRange: [1, .6], extrapolate: 'clamp' });
  const cardSlide = reveal.interpolate({ inputRange: [...revealStages.card], outputRange: [10, 0], extrapolate: 'clamp' });
  useEffect(() => {
    if (width > 0 && targetId && targetY !== undefined) onTargetLayout?.(targetId + ':' + (transition?.from ?? ''), targetY, moving ? { top: stops[fromIndex].y - stops[fromIndex].size / 2 - 44, bottom: stops[toIndex].y + 110 * Math.min(fontScale, 1.5) } : undefined);
  }, [width, targetId, targetY, onTargetLayout, transition]);
  const dots = stops.slice(0, -1).flatMap((stop, index) => curvedDashes(stop, stops[index + 1], entries[index + 1].sectionStart)
    .map((dot, dotIndex, segmentDots) => ({ ...dot,
      threshold: moving && index === fromIndex ? samples[dotIndex + 1].fraction * TRAVEL_END : null,
      color: lessonState(entries[index].lesson) === 'COMPLETED' ? '#55A9E8' : '#A2B6CC' })));
  return <View pointerEvents={moving ? "none" : "auto"} accessibilityState={{ busy: moving }} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    {width > 0 ? <>
      <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
        {dots.map((dot, index) => <View key={index} style={[s.dash, { left: dot.x - 4.5, top: dot.y - 2.2, backgroundColor: dot.threshold === null ? dot.color : '#A2B6CC', transform: [{ rotate: dot.angle + 'deg' }] }]}>
          {dot.threshold !== null ? <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 3, backgroundColor: '#55A9E8', opacity: progress.interpolate({ inputRange: [0, dot.threshold, Math.min(1, dot.threshold + .006), 1], outputRange: [0, 0, 1, 1] }) }]} /> : null}
        </View>)}
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
        const source = moving && index === fromIndex;
        const destination = moving && index === toIndex;
        const nodeReveal = source ? completion : destination ? reveal : null;
        const pulse = nodeReveal?.interpolate({ inputRange: [0, .55, 1], outputRange: [1, lesson.type === 'UNIT_CHALLENGE' ? 1.09 : 1.055, 1] });
        const iconScale = nodeReveal?.interpolate({ inputRange: [0, 1], outputRange: [.75, 1] });
        return <View key={lesson.id} style={{ height: stop.height }}>
          <View pointerEvents="none" accessible={false} style={[s.landscape, { left: stop.right ? width - 65 : -70, top: stop.height - 100, backgroundColor: index % 3 === 0 ? '#DCEEFF' : '#E3F2EB' }]} />
          {!expanded[index] && index < entries.length - 1 ? <PathScenery variant={[0, 3, 4, 1, 2, 5, 0][index % 7]} right={!stop.right} /> : null}
          {sectionStart ? <View style={[s.section, { left: labelLeft, width: labelWidth }]}>
            <View style={s.sectionTop}><View style={s.sectionMark}><Text style={s.sectionNumber}>{topicIndex + 1}</Text></View><Text maxFontSizeMultiplier={1.5} style={s.eyebrow}>TEMA {topicIndex + 1}</Text></View>
            <Text numberOfLines={2} maxFontSizeMultiplier={1.5} style={s.sectionTitle}>{topic.title}</Text>
          </View> : null}
          <Animated.View style={{ position: 'absolute', left: stop.x - radius, top: stop.y - stop.top - radius, width: stop.size, height: stop.size, transform: [{ scale: pulse ?? 1 }, { scale: destination ? arrivalScale : 1 }] }}>
          <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={moving} onPress={() => onLessonPress(lesson)}
            style={({ pressed }) => ({ flex: 1, opacity: pressed ? .75 : 1 })}>
            <NodeFace fill={fill} ring={ring} radius={radius} state={state} challenge={lesson.type === 'UNIT_CHALLENGE'} hideCheck={source} starProgress={source ? completion : undefined} iconOpacity={destination ? channel(revealStages.icon) : nodeReveal ?? 1} iconScale={iconScale ?? 1} />
            {nodeReveal ? <Animated.View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill, { opacity: source ? oldCompletionOpacity : oldDestinationOpacity }]}>
              <NodeFace fill={source ? colors.red : '#A6AFBD'} ring={source ? '#FFD3DE' : '#EDF0F4'} radius={radius} state={source ? 'CURRENT' : 'LOCKED_PREREQUISITE'} challenge={lesson.type === 'UNIT_CHALLENGE'} iconOpacity={destination ? oldLockOpacity : 1} iconScale={destination ? oldLockScale : 1} />
            </Animated.View> : null}
            {source ? <View pointerEvents="none" style={StyleSheet.absoluteFill}><CompletionDrawing progress={completion} size={stop.size} challenge={lesson.type === 'UNIT_CHALLENGE'} /></View> : null}
            {destination ? <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: reveal.interpolate({ inputRange: [0, .15, .85, 1], outputRange: [0, 1, 1, 0] }) }]}><CompletionDrawing progress={reveal} size={stop.size} challenge destination color={paid ? '#E9B64A' : colors.red} /></Animated.View> : null}
            {expanded[index] ? <Animated.View style={[s.currentDot, { backgroundColor: paid ? '#D79920' : colors.red, opacity: destination ? channel(revealStages.dot) : 1, transform: [{ scale: destination ? reveal.interpolate({ inputRange: [.6, .8, 1], outputRange: [.6, 1.12, 1], extrapolate: 'clamp' }) : 1 }] }]} /> : null}
          </Pressable></Animated.View>
          <Animated.View style={[s.label, destination && { opacity: channel(revealStages.card), transform: [{ translateY: cardSlide }] }, source && { opacity: completion }, { left: labelLeft, width: labelWidth, top: stop.y - stop.top - (expanded[index] ? 82 : 32) * Math.min(fontScale, 1.5), alignItems: stop.right ? 'flex-end' : 'flex-start' }, expanded[index] && s.currentCard, expanded[index] && paid && { borderColor: '#D9AA43', backgroundColor: '#FFF1D3' }]}>
            {expanded[index] ? <><View pointerEvents="none" style={[s.cardJoin, stop.right ? { right: -9 } : { left: -9 }, paid && { backgroundColor: '#FFF1D3' }]} /><Text maxFontSizeMultiplier={1.5} style={[s.cardEyebrow, paid && { color: colors.gold }]}>{paid ? 'ACCESO PREMIUM' : 'SIGUIENTE PASO'}</Text></> : null}
            <Text numberOfLines={2} maxFontSizeMultiplier={1.5} style={[s.title, expanded[index] && !paid && { color: '#FFF', fontSize: 18, lineHeight: 23 }, { textAlign: stop.right ? 'right' : 'left' }]}>{index + 1}. {lesson.title}</Text>
            <Text numberOfLines={2} maxFontSizeMultiplier={1.5} style={[s.meta, expanded[index] && !paid && { color: '#E4F2FF' }, { textAlign: stop.right ? 'right' : 'left' }]}>{lesson.type === 'UNIT_CHALLENGE' ? `Reto de unidad · ${lessonLabels[state]}` : current ? `Paso ${index + 1} de ${entries.length}` : lessonLabels[state]}</Text>
            {locked && lesson.progressStatus === 'COMPLETED' ? <Text style={s.meta}>Completada</Text> : null}
            {expanded[index] ? <View style={{ width: '100%', marginTop: 5 }}><Button compact arrow={!paid} title={paid ? 'Ver acceso' : 'Continuar'} tone={paid ? 'gold' : 'red'} onPress={() => onLessonPress(lesson)} /></View> : null}
          </Animated.View>
          {!moving && lesson.id === currentNodeId ? <View pointerEvents="none" accessible={false} style={{ position: 'absolute', left: vehiclePosition(stop).x, top: vehiclePosition({ x: stop.x, y: stop.y - stop.top - radius - 2 }).y }}><RouteBus /></View> : null}
        </View>;
      })}
      {moving ? <Animated.View pointerEvents="none" accessible={false} style={{ position: 'absolute', left: 0, top: 0, width: 44, height: 42, overflow: 'visible', transform: [{ translateX: busX }, { translateY: busY }] }}><Animated.View style={{ width: 44, height: 42, transformOrigin: vehicleOrigin, transform: [{ rotate: rotation }] }}>
        {turn ? <Animated.View style={[StyleSheet.absoluteFill, { opacity: Animated.subtract(1, facingMix) }]}><RouteBus /></Animated.View> : null}
        <Animated.View style={{ opacity: turn ? facingMix : 1 }}><TravelBus progress={progress} animate={animate} facingLeft={facingLeft} /></Animated.View>
      </Animated.View></Animated.View> : null}
      {entries.length ? <View style={s.finish}><View accessible={false} style={s.destination}><View style={s.flagPole} /><View style={s.finishFlag}><View style={s.flagSquare} /><View style={[s.flagSquare, { alignSelf: 'flex-end' }]} /></View></View><Text style={s.finishText}>Fin de la ruta</Text></View> : null}
    </> : null}
  </View>;
}
// Both layers share exact geometry. Only presentation fades; backend state and
// hit targets never change during the choreography.
function NodeFace({ fill, ring, radius, state, challenge, hideCheck = false, starProgress, iconOpacity = 1, iconScale = 1 }: {
  fill: string; ring: string; radius: number; state: ReturnType<typeof lessonState>; challenge: boolean;
  hideCheck?: boolean; starProgress?: Animated.Value; iconOpacity?: number | Animated.Value | Animated.AnimatedInterpolation<number>; iconScale?: number | Animated.AnimatedInterpolation<number>;
}) {
  const locked = state === 'LOCKED_ACCESS' || state === 'LOCKED_PREREQUISITE';
  return <View pointerEvents="none" accessible={false} style={[s.halo, { flex: 1, borderRadius: radius, backgroundColor: ring }]}>
    <View style={[s.disc, { backgroundColor: fill, borderColor: state === 'AVAILABLE' ? colors.blue : '#FFFFFF90' }]}>
      <View style={s.shine} />
      <Animated.View style={{ opacity: iconOpacity, transform: [{ scale: iconScale }] }}>
        {locked ? <View><View style={s.shackle} /><View style={s.lockBody}><View style={[s.keyhole, { backgroundColor: fill }]} /></View></View>
          : challenge ? <Trophy size={44} color="#FFF" accent={fill} starProgress={starProgress} />
          : state === 'CURRENT' ? <NavigationIcon name="CoursesTab" size={34} color="#FFF" filled />
          : state === 'COMPLETED' ? hideCheck ? null : <Svg width={radius * 2} height={radius * 2} viewBox="0 0 100 100"><Path d="M35 50l10 10 20-20" fill="none" stroke="#FFF" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" /></Svg> : <Text style={s.symbol}>›</Text>}
      </Animated.View>
    </View>
  </View>;
}
const s = StyleSheet.create({
  section: { position: 'absolute', top: 3, gap: 5, paddingVertical: 4, paddingHorizontal: 2 },
  sectionTop: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sectionMark: { width: 25, height: 25, borderRadius: 13, backgroundColor: '#D4E9FC', borderWidth: 2, borderColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  sectionNumber: { color: colors.blue, fontSize: 12, fontWeight: '800' },
  eyebrow: { fontSize: 10, lineHeight: 14, fontWeight: '800', letterSpacing: 1, color: colors.blue },
  sectionTitle: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: '#315B7C' },
  finish: { alignItems: 'center', gap: 7, paddingBottom: 22, paddingTop: 3 },
  destination: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#DEECF8', borderWidth: 3, borderColor: '#FFF' },
  finishText: { fontSize: 14, lineHeight: 20, color: colors.muted, fontWeight: '700' },
  dash: { position: 'absolute', width: 9, height: 4.4, borderRadius: 3 },
  halo: { ...shadows.node, padding: 6, borderWidth: 1, borderColor: '#FFFFFFB0' },
  disc: { flex: 1, borderRadius: 100, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  shine: { position: 'absolute', width: '120%', height: '58%', top: -8, backgroundColor: '#FFFFFF12', borderBottomLeftRadius: 60, borderBottomRightRadius: 60 },
  symbol: { color: '#FFF', fontSize: 35, lineHeight: 42, fontWeight: '800' },
  currentDot: { position: 'absolute', top: -10, alignSelf: 'center', width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: '#FFF' },
  label: { position: 'absolute', gap: 4 },
  title: { fontSize: 16, lineHeight: 21, fontWeight: '700', color: colors.ink },
  meta: { fontSize: 12, lineHeight: 17, color: colors.muted },
  currentCard: { borderRadius: 23, borderWidth: 1, borderColor: '#4898ED', backgroundColor: '#0966D7', padding: 12, ...shadows.card, shadowColor: '#005EC1', shadowOpacity: .26, shadowRadius: 15 },
  cardJoin: { position: 'absolute', top: '42%', width: 18, height: 18, backgroundColor: '#0966D7', transform: [{ rotate: '45deg' }] },
  cardEyebrow: { color: '#C5E6FF', fontSize: 9, lineHeight: 13, fontWeight: '800', letterSpacing: 1 },
  landscape: { position: 'absolute', width: 120, height: 110, borderRadius: 65, opacity: .65 },
  flagPole: { width: 3, height: 43, backgroundColor: '#4C729C', position: 'absolute', left: 13, top: 9 },
  finishFlag: { width: 26, height: 22, backgroundColor: '#FFF', position: 'absolute', left: 16, top: 9, borderWidth: 1, borderColor: '#4C729C' },
  flagSquare: { width: 12, height: 10, backgroundColor: '#4C729C' },
  check: { width: 27, height: 16, borderLeftWidth: 5, borderBottomWidth: 5, borderColor: '#FFF', borderRadius: 2, transform: [{ rotate: '-45deg' }], marginTop: -5 },
  shackle: { width: 16, height: 15, borderWidth: 3, borderColor: '#FFF', borderTopLeftRadius: 10, borderTopRightRadius: 10, alignSelf: 'center', marginBottom: -3 },
  lockBody: { width: 25, height: 22, backgroundColor: '#FFF', borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  keyhole: { width: 4, height: 8, borderRadius: 3 },
});
