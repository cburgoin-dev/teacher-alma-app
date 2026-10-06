import { ActiveHomeHero } from './ActiveHomeHero';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import Trophy from 'lucide-react-native/icons/trophy';
import { Button } from '../../courses/components/ui';
import { CourseCover } from '../../courses/components/CourseCover';
import { courseDestination, courseStatus, type HomeDestination } from '../presentation';
import type { HomeCourse, HomeHero, HomeIdentity } from '../types';
import { colors, shadows } from '../../../theme';

export function HomeHeroCard({ hero, onNavigate }: { hero: HomeHero; onNavigate: (destination: HomeDestination) => void }) {
  const { width, fontScale } = useWindowDimensions();
  if (hero.type === 'ACTIVE') return <ActiveHomeHero hero={hero} onNavigate={onNavigate} />;
  const artVisible = width >= 350 && fontScale < 1.3;
  let eyebrow: string, title: string, detail: string | null = null, course: HomeIdentity | null = null;
  let percentage: number | null = null, destination: HomeDestination | null = null, cta: string | null = null;
  let recommendation: HomeCourse | null = null;
  switch (hero.type) {
    case 'NEW':
      eyebrow = 'TU PRIMER PASO'; title = 'Descubre tu nivel';
      detail = 'Un diagnóstico corto te ayudará a encontrar por dónde empezar.';
      break;
    case 'ASSESSED':
      eyebrow = 'TU PUNTO DE PARTIDA'; title = hero.diagnostic.recommendedLevel ? `Tu nivel recomendado: ${hero.diagnostic.recommendedLevel}` : 'Tu diagnóstico está listo';
      recommendation = hero.recommendedCourse; course = recommendation;
      detail = recommendation ? null : 'Explora los cursos y elige tu próximo paso.';
      break;
    case 'COURSE_COMPLETED':
      eyebrow = '¡UN GRAN LOGRO!'; course = hero.completedCourse;
      title = hero.completedCourse ? '¡Curso completado!' : 'Tu aprendizaje cuenta';
      detail = hero.completedCourse?.title ?? 'Tu curso completado ya no está disponible. Puedes seguir explorando.';
      percentage = hero.completedCourse?.progress.percentage ?? null;
      recommendation = hero.recommendedCourse;
      break;
  }
  if (recommendation) {
    destination = courseDestination(recommendation);
    cta = recommendation.status === 'COMING_SOON' ? 'Ver curso' : 'Conocer el curso';
  }
  return <View style={s.hero}>
    <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 360 300" preserveAspectRatio="none"><Defs><LinearGradient id="homeWelcome" x1={0} y1={1} x2={1} y2={0}><Stop offset={0} stopColor="#0750B2" /><Stop offset={1} stopColor="#258BFA" /></LinearGradient></Defs><Rect width="100%" height="100%" fill="url(#homeWelcome)" /><Path d="M220 76 C211 76 211 65 220 65 C219 52 237 48 242 61 C252 57 260 63 256 70 Q270 79 257 82 L225 82 Q218 82 220 76 Z" fill="#9CDBFF" opacity={0.12} /><Path d="M286 0 C247 55 304 70 287 117 S321 178 360 163 L360 0 Z" fill="#77C3FF" opacity={0.09} /></Svg>
    </View>
    <Text style={s.eyebrow}>{eyebrow}</Text>
    <Text accessibilityRole="header" style={s.title}>{title}</Text>
    {hero.type !== 'ASSESSED' || !recommendation ? <View style={s.heroRow}>
      <View style={s.copy}>
        {detail ? <Text style={s.detail}>{detail}</Text> : null}
      </View>
      {artVisible ? hero.type === 'COURSE_COMPLETED' && hero.completedCourse ? <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.celebration}>
          <Svg width="72" height="68" viewBox="0 0 72 68" style={StyleSheet.absoluteFill}>
            <Path d="M20 40 L15 66 L29 59 L36 65 L40 42 M38 42 L44 65 L51 58 L64 62 L53 37" fill="#FF6575" />
            <Path d="M36 3 L48 8 L58 7 L61 20 L67 29 L60 40 L58 51 L45 52 L36 58 L25 52 L13 51 L11 39 L5 29 L12 19 L14 8 L26 8 Z" fill="#FFE3A0" />
            <Path d="M36 9 L48 14 L55 25 L53 39 L43 47 L29 47 L18 39 L16 25 L23 14 Z" fill="#FFC965" />
            <Path d="M65 0 L67 5 L72 7 L67 9 L65 14 L63 9 L58 7 L63 5 Z M5 45 L7 49 L11 51 L7 53 L5 57 L3 53 L0 51 L3 49 Z" fill="#FFF1C3" />
          </Svg><Trophy color="#805018" size={30} strokeWidth={2.2} />
        </View> : course ? <CourseCover uri={course.coverUrl} level={course.level} hero style={s.cover} />
        : hero.type === 'NEW' ? <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.levelSign}><Text style={s.signText}>{"What's\nyour level?"}</Text><View style={s.signRule} /></View> : null : null}
    </View> : null}
    {percentage !== null ? <View style={s.progress} accessibilityRole="progressbar" accessibilityLabel="Progreso del curso" accessibilityValue={{ min: 0, max: 100, now: percentage }}>
      <View style={s.track}><View style={[s.fill, { width: `${Math.max(0, Math.min(100, percentage))}%` }]} /></View><Text style={s.percent}>{percentage}%</Text>
    </View> : null}
    {recommendation ? <View style={s.recommendation}>
      <View style={s.copy}><Text style={s.small}>{hero.type === 'ASSESSED' ? 'RECOMENDADO PARA TI' : 'TU PRÓXIMO CURSO'}</Text>
        <Text style={s.recommendedTitle}>{recommendation.title}</Text>
        <Text style={s.note}>{courseStatus(recommendation)}{recommendation.status !== 'COMING_SOON' && !recommendation.access.hasFullAccess && recommendation.access.hasFreeContent ? ' · Incluye contenido gratuito' : ''}</Text>
      </View>
      {artVisible && hero.type === 'ASSESSED' ? <CourseCover uri={recommendation.coverUrl} level={recommendation.level} hero style={s.cover} /> : null}
    </View> : null}
    {hero.type === 'NEW' ? <Button title="Hacer diagnóstico" disabled /> : null}
    {destination && cta ? <Button title={cta} arrow onPress={() => onNavigate(destination!)} /> : null}
  </View>;
}
const s = StyleSheet.create({
  hero: { backgroundColor: '#0962D7', borderRadius: 24, padding: 16, gap: 10, overflow: 'hidden', ...shadows.card },
  eyebrow: { color: '#D5E8FF', fontSize: 12, lineHeight: 17, fontWeight: '800', letterSpacing: 1.5 },
  heroRow: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  copy: { flex: 1, minWidth: 0, gap: 5, justifyContent: 'center' },
  title: { fontSize: 25, lineHeight: 31, fontWeight: '800', color: '#FFF', letterSpacing: -.5 },
  detail: { fontSize: 15, lineHeight: 21, color: '#E2EFFF' },
  courseBadge: { alignSelf: 'flex-start', backgroundColor: '#D6E9FF', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, color: '#00499F', fontSize: 14, lineHeight: 20, fontWeight: '700', overflow: 'hidden' },
  nodeKind: { fontSize: 13, lineHeight: 19, color: '#FFF', fontWeight: '600' },
  cover: { width: '29%', minHeight: 82, borderTopLeftRadius: 50, borderTopRightRadius: 18, borderBottomRightRadius: 18, borderBottomLeftRadius: 18 },
  levelSign: { width: 92, minHeight: 88, padding: 8, borderRadius: 16, alignSelf: 'center', backgroundColor: '#F2F8FF', justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '-8deg' }] },
  signText: { color: '#08438D', fontSize: 17, lineHeight: 21, fontWeight: '800', fontStyle: 'italic', textAlign: 'center' },
  signRule: { width: 34, height: 3, backgroundColor: colors.red, borderRadius: 3, marginTop: 8 },
  celebration: { width: 72, height: 68, alignItems: 'center', justifyContent: 'center', paddingBottom: 10, alignSelf: 'center' },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  track: { flex: 1, height: 12, borderRadius: 10, backgroundColor: '#77ADEE', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 10, backgroundColor: colors.red },
  percent: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  note: { color: '#E3EEFF', fontSize: 14, lineHeight: 21 },
  recommendation: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: '#FFFFFF40', paddingTop: 10 },
  small: { color: '#C8E3FF', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  recommendedTitle: { color: '#FFF', fontSize: 20, lineHeight: 26, fontWeight: '700' },
});
