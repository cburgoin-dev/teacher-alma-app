import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { ClipPath, Defs, Ellipse, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { HomeCourseArtwork } from './HomeCourseArtwork';
import { activeDestination, type HomeDestination } from '../presentation';
import type { ActiveHero } from '../types';

/** Home composition only. The course artwork is clipped into the card, never a second catalog tile. */
export function ActiveHomeHero({ hero, onNavigate }: { hero: ActiveHero; onNavigate: (destination: HomeDestination) => void }) {
  const { width, fontScale } = useWindowDimensions();
  const illustrated = !!hero.course && width >= 350 && fontScale < 1.3;
  const destination = activeDestination(hero);
  const locked = !!hero.currentNode && (!hero.currentNode.access.hasAccess || hero.currentNode.access.lockReason === 'ACCESS');
  const percentage = hero.course?.progress.percentage;
  const content = <View style={s.hero}>
    <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 360 300" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="homeBlue" x1={0} y1={1} x2={1} y2={0}><Stop offset={0} stopColor="#00429F" /><Stop offset={0.5} stopColor="#126AE1" /><Stop offset={1} stopColor="#429CFA" /></LinearGradient>
          <ClipPath id="homeCourseLandscape"><Path d="M360 24 C321 20 292 20 270 36 C228 64 217 91 225 128 C234 174 246 227 257 273 Q308 281 360 284 Z" /></ClipPath>
        </Defs>
        <Rect width="360" height="300" fill="url(#homeBlue)" />
        <Ellipse cx="60" cy="62" rx="85" ry="38" fill="#7EC4FF" opacity={0.045} />
        <Ellipse cx="186" cy="195" rx="47" ry="36" fill="#00439B" opacity={0.07} />
        <Ellipse cx="178" cy="116" rx="13" ry="5" fill="#7EC4FF" opacity={0.12} />
        <Ellipse cx="183" cy="111" rx="6" ry="7" fill="#7EC4FF" opacity={0.12} />
        {illustrated && hero.course ? <HomeCourseArtwork uri={hero.course.coverUrl} level={hero.course.level} box={{ x: 225, y: 24, width: 135, height: 260 }} clipPath="url(#homeCourseLandscape)" /> : null}
        {illustrated ? <Path d="M219 300 C261 267 272 229 360 225 L360 300 Z" fill="#0754B9" /> : null}
      </Svg>
    </View>
    <View style={s.heading}><Text accessibilityRole="header" style={s.headingText}>Continuar aprendiendo</Text>{destination ? <View accessible={false} style={s.headingArrow}><ChevronRight color="#0861D3" size={17} strokeWidth={2.5} /></View> : null}</View>
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
      {destination ? <View style={s.cta}>
        <Text style={s.ctaText}>{locked ? 'Ver ruta' : 'Continuar'}</Text><ArrowRight color="#FFF" size={23} />
      </View> : null}
    </View>
    {illustrated && hero.course?.level ? <View pointerEvents="none" accessible={false} style={s.levelBadge}><Text style={s.level}>{hero.course.level}</Text><Text style={s.language}>Inglés</Text></View> : null}
    {illustrated ? <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.motivation}>
      <Text allowFontScaling={false} style={s.motivationText}>{"Let's\ndo this!"}</Text>
    </View> : null}
  </View>;
  return destination ? <Pressable accessibilityRole="button" accessibilityLabel={locked ? 'Ver ruta del curso' : 'Continuar en la ruta del curso'}
    accessibilityHint={`${hero.course?.title}. ${hero.currentNode?.title}`}
    onPress={() => onNavigate(destination)} style={({ pressed }) => [s.shadow, pressed && { opacity: .85 }]}>{content}</Pressable>
    : <View style={s.shadow}>{content}</View>;
}
const s = StyleSheet.create({
  shadow: { borderRadius: 22, backgroundColor: '#0B64DA', shadowColor: '#174D99', shadowOffset: { width: 0, height: 5 }, shadowOpacity: .15, shadowRadius: 9, elevation: 3 },
  hero: { borderRadius: 22, overflow: 'hidden', paddingHorizontal: 18, paddingTop: 15, paddingBottom: 15 },
  heading: { flexDirection: 'row', gap: 7, alignItems: 'center', marginBottom: 14 },
  headingText: { color: '#FFF', fontWeight: '800', fontSize: 20, lineHeight: 26, letterSpacing: -.35, flexShrink: 1 },
  headingArrow: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#C3E3FF', alignItems: 'center', justifyContent: 'center' },
  content: { gap: 8 }, illustrated: { width: '65%' },
  pill: { color: '#0053B8', fontWeight: '800', fontSize: 14, lineHeight: 19, paddingHorizontal: 11, paddingVertical: 4, backgroundColor: '#CCE5FF', borderRadius: 12, overflow: 'hidden', alignSelf: 'flex-start', marginBottom: 3 },
  topic: { color: '#E3EFFF', fontSize: 16, lineHeight: 21 },
  node: { color: '#FFF', fontSize: 23, lineHeight: 28, fontWeight: '800', letterSpacing: -.4 },
  kind: { color: '#E5F1FF', fontSize: 12, lineHeight: 17, fontWeight: '600' },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 9, marginBottom: 7 },
  track: { flex: 1, height: 12, backgroundColor: '#7AAEF0', borderRadius: 9, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 9, backgroundColor: '#FF3654' }, percent: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  cta: { minHeight: 48, borderRadius: 26, backgroundColor: '#FF304E', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 11, marginTop: 2 },
  ctaText: { color: '#FFF', fontSize: 17, lineHeight: 23, fontWeight: '800', flexShrink: 1 },
  note: { color: '#E3EFFF', fontSize: 13, lineHeight: 19 },
  levelBadge: { position: 'absolute', top: '35%', right: 8, backgroundColor: '#FFFFFFF2', paddingVertical: 5, paddingHorizontal: 6, borderRadius: 12, maxWidth: '23%', alignItems: 'center' },
  motivation: { position: 'absolute', right: 18, bottom: 20, transform: [{ rotate: '-7deg' }] },
  motivationText: { color: '#FFF', fontSize: 14, lineHeight: 15, fontWeight: '800', fontStyle: 'italic', textAlign: 'center' },
  language: { color: '#102347', fontSize: 10, lineHeight: 14 },
  level: { color: '#102347', fontSize: 18, fontWeight: '800' },
});
