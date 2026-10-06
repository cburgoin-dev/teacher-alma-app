import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { ClipPath, Defs, Ellipse, Image as SvgImage, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import { courseCoverSource } from '../../courses/components/CourseCover';
import { activeDestination, type HomeDestination } from '../presentation';
import type { ActiveHero } from '../types';

/** Home composition only. The course artwork is clipped into the card, never a second catalog tile. */
export function ActiveHomeHero({ hero, onNavigate }: { hero: ActiveHero; onNavigate: (destination: HomeDestination) => void }) {
  const { width, fontScale } = useWindowDimensions();
  const uri = hero.course?.coverUrl ?? null;
  const [readyUri, setReadyUri] = useState<string | null>(null);
  useEffect(() => {
    if (!uri) return;
    let current = true;
    // SvgImage has no error callback. Keep bundled artwork until the remote image is usable.
    Image.getSize(uri, () => { if (current) setReadyUri(uri); }, () => { if (current) setReadyUri(null); });
    return () => { current = false; };
  }, [uri]);

  const illustrated = !!hero.course && width >= 350 && fontScale < 1.3;
  const destination = activeDestination(hero);
  const locked = !!hero.currentNode && (!hero.currentNode.access.hasAccess || hero.currentNode.access.lockReason === 'ACCESS');
  const percentage = hero.course?.progress.percentage;
  const source = hero.course ? courseCoverSource(uri === readyUri ? uri : null, hero.course.level) : null;
  return <View style={s.shadow}><View style={s.hero}>
    <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 360 300" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="homeBlue" x1="0" y1="1" x2="1" y2="0"><Stop offset="0" stopColor="#0047AE" /><Stop offset=".5" stopColor="#126AE1" /><Stop offset="1" stopColor="#3995F9" /></LinearGradient>
          <ClipPath id="homeCourseLandscape"><Path d="M360 38 C302 32 294 64 251 82 C216 96 225 126 243 162 C268 211 245 258 218 300 L360 300 Z" /></ClipPath>
        </Defs>
        <Rect width="360" height="300" fill="url(#homeBlue)" />
        <Ellipse cx="178" cy="116" rx="13" ry="5" fill="#7EC4FF" opacity=".12" />
        <Ellipse cx="183" cy="111" rx="6" ry="7" fill="#7EC4FF" opacity=".12" />
        {illustrated && source ? <SvgImage href={source} x="216" y="38" width="155" height="262" preserveAspectRatio="xMaxYMid slice" clipPath="url(#homeCourseLandscape)" /> : null}
        {illustrated ? <Path d="M253 278 Q295 235 360 238 L360 300 L219 300 Z" fill="#0861D3" /> : null}
      </Svg>
    </View>
    <View style={s.heading}><Text accessibilityRole="header" style={s.headingText}>Continuar aprendiendo</Text><View accessible={false} style={s.headingArrow}><ArrowRight color="#0861D3" size={16} /></View></View>
    <View style={[s.content, illustrated && s.illustrated]}>
      {hero.course ? <Text style={s.pill}>{hero.course.title}</Text> : null}
      {hero.topic ? <Text style={s.topic}>{hero.topic.title}</Text> : null}
      <Text style={s.node}>{hero.currentNode?.title ?? hero.course?.title ?? 'Tu aprendizaje sigue aquí'}</Text>
      {hero.currentNode?.type === 'UNIT_CHALLENGE' ? <Text style={s.kind}>Reto de unidad</Text> : null}
      {percentage !== undefined ? <View style={s.progress} accessibilityRole="progressbar" accessibilityLabel="Progreso del curso" accessibilityValue={{ min: 0, max: 100, now: percentage }}>
        <View style={s.track}><View style={[s.fill, { width: `${Math.max(0, Math.min(100, percentage))}%` }]} /></View><Text style={s.percent}>{percentage}%</Text>
      </View> : null}
      {!hero.course || !hero.currentNode ? <Text style={s.note}>Tu siguiente paso no está disponible en este momento. Puedes explorar los cursos.</Text>
        : locked ? <Text style={s.note}>Este paso requiere acceso. Consulta tu ruta; tu avance se conserva.</Text> : null}
      {destination ? <Pressable accessibilityRole="button" accessibilityLabel={locked ? 'Ver ruta del curso' : 'Continuar en la ruta del curso'} onPress={() => onNavigate(destination)} style={({ pressed }) => [s.cta, pressed && { opacity: .82 }]}>
        <Text style={s.ctaText}>{locked ? 'Ver ruta' : 'Continuar'}</Text><ArrowRight color="#FFF" size={23} />
      </Pressable> : null}
    </View>
    {illustrated && hero.course?.level ? <View pointerEvents="none" accessible={false} style={s.levelBadge}><Text style={s.level}>{hero.course.level}</Text></View> : null}
  </View></View>;
}
const s = StyleSheet.create({
  shadow: { borderRadius: 22, backgroundColor: '#0B64DA', shadowColor: '#174D99', shadowOffset: { width: 0, height: 5 }, shadowOpacity: .15, shadowRadius: 9, elevation: 3 },
  hero: { borderRadius: 22, overflow: 'hidden', paddingHorizontal: 17, paddingTop: 16, paddingBottom: 15 },
  heading: { flexDirection: 'row', gap: 7, alignItems: 'center', marginBottom: 16 },
  headingText: { color: '#FFF', fontWeight: '800', fontSize: 20, lineHeight: 26, letterSpacing: -.35, flexShrink: 1 },
  headingArrow: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#C3E3FF', alignItems: 'center', justifyContent: 'center' },
  content: { gap: 7 }, illustrated: { width: '67%' },
  pill: { color: '#0053B8', fontWeight: '800', fontSize: 14, lineHeight: 19, paddingHorizontal: 11, paddingVertical: 5, backgroundColor: '#CCE5FF', borderRadius: 12, overflow: 'hidden', alignSelf: 'flex-start', marginBottom: 3 },
  topic: { color: '#E3EFFF', fontSize: 16, lineHeight: 21 },
  node: { color: '#FFF', fontSize: 23, lineHeight: 28, fontWeight: '800', letterSpacing: -.4 },
  kind: { color: '#E5F1FF', fontSize: 12, lineHeight: 17, fontWeight: '600' },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5, marginBottom: 5 },
  track: { flex: 1, height: 12, backgroundColor: '#7AAEF0', borderRadius: 9, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 9, backgroundColor: '#FF3654' }, percent: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  cta: { minHeight: 48, borderRadius: 26, backgroundColor: '#FF304E', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 11, marginTop: 2 },
  ctaText: { color: '#FFF', fontSize: 17, lineHeight: 23, fontWeight: '800', flexShrink: 1 },
  note: { color: '#E3EFFF', fontSize: 13, lineHeight: 19 },
  levelBadge: { position: 'absolute', top: '43%', right: 12, backgroundColor: '#FFFFFFF2', paddingVertical: 9, paddingHorizontal: 10, borderRadius: 12, maxWidth: '23%' },
  level: { color: '#102347', fontSize: 20, fontWeight: '800' },
});
