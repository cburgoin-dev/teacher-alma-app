import { ActiveHomeHero } from './ActiveHomeHero';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
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
  let recommendation: HomeCourse | null = null, note: string | null = null;
  switch (hero.type) {
    case 'NEW':
      eyebrow = 'TU PRIMER PASO'; title = 'Descubre tu nivel';
      detail = 'Un diagnóstico corto te ayudará a encontrar por dónde empezar.';
      note = 'Próximamente · Diagnóstico aún no disponible.';
      break;
    case 'ASSESSED':
      eyebrow = 'TU PUNTO DE PARTIDA'; title = hero.diagnostic.recommendedLevel ? `Tu nivel recomendado: ${hero.diagnostic.recommendedLevel}` : 'Tu diagnóstico está listo';
      recommendation = hero.recommendedCourse; course = recommendation;
      detail = recommendation ? 'Este es el curso recomendado para ti.' : 'Explora los cursos y elige tu próximo paso.';
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
      <Svg width="100%" height="100%"><Defs><LinearGradient id="homeWelcome" x1={0} y1={1} x2={1} y2={0}><Stop offset={0} stopColor="#0750B2" /><Stop offset={1} stopColor="#258BFA" /></LinearGradient></Defs><Rect width="100%" height="100%" fill="url(#homeWelcome)" /></Svg>
    </View><View pointerEvents="none" accessible={false} style={s.glow} />
    <Text style={s.eyebrow}>{eyebrow}</Text>
    <Text accessibilityRole="header" style={s.title}>{title}</Text>
    <View style={s.heroRow}>
      <View style={s.copy}>
        {detail ? <Text style={s.detail}>{detail}</Text> : null}
      </View>
      {artVisible ? hero.type === 'COURSE_COMPLETED' && hero.completedCourse ? <View accessible={false} style={s.celebration}><Trophy color="#FFE297" size={48} strokeWidth={2.3} /><View style={s.spark} /></View> : course ? <CourseCover uri={course.coverUrl} level={course.level} hero style={s.cover} />
        : hero.type === 'NEW' ? <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.levelSign}><Text style={s.signText}>{"What's\nyour level?"}</Text><View style={s.signRule} /></View> : null : null}
    </View>
    {percentage !== null ? <View style={s.progress} accessibilityRole="progressbar" accessibilityLabel="Progreso del curso" accessibilityValue={{ min: 0, max: 100, now: percentage }}>
      <View style={s.track}><View style={[s.fill, { width: `${Math.max(0, Math.min(100, percentage))}%` }]} /></View><Text style={s.percent}>{percentage}%</Text>
    </View> : null}
    {recommendation ? <View style={s.recommendation}><Text style={s.small}>{hero.type === 'ASSESSED' ? 'RECOMENDADO PARA TI' : 'TU PRÓXIMO CURSO'}</Text><Text style={s.recommendedTitle}>{recommendation.title}</Text><Text style={s.detail}>{courseStatus(recommendation)}</Text>{!recommendation.access.hasFullAccess ? <Text style={s.note}>{recommendation.access.hasFreeContent ? 'Incluye contenido gratuito' : 'Consulta el acceso al curso'}</Text> : null}</View> : null}
    {note ? <Text style={s.note}>{note}</Text> : null}
    {hero.type === 'NEW' ? <Button title="Hacer diagnóstico · Próximamente" disabled /> : null}
    {destination && cta ? <Button title={cta} arrow onPress={() => onNavigate(destination!)} /> : null}
  </View>;
}
const s = StyleSheet.create({
  hero: { backgroundColor: '#0962D7', borderRadius: 24, padding: 18, gap: 16, overflow: 'hidden', ...shadows.card },
  glow: { position: 'absolute', width: 320, height: 320, borderRadius: 160, backgroundColor: '#2682EE', right: -170, top: -130 },
  eyebrow: { color: '#D5E8FF', fontSize: 12, lineHeight: 17, fontWeight: '800', letterSpacing: 1.5 },
  heroRow: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  copy: { flex: 1, minWidth: 0, gap: 8, justifyContent: 'center' },
  title: { fontSize: 27, lineHeight: 33, fontWeight: '800', color: '#FFF', letterSpacing: -.5 },
  detail: { fontSize: 16, lineHeight: 23, color: '#E2EFFF' },
  courseBadge: { alignSelf: 'flex-start', backgroundColor: '#D6E9FF', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, color: '#00499F', fontSize: 14, lineHeight: 20, fontWeight: '700', overflow: 'hidden' },
  nodeKind: { fontSize: 13, lineHeight: 19, color: '#FFF', fontWeight: '600' },
  cover: { width: '29%', minHeight: 100, borderTopLeftRadius: 50, borderTopRightRadius: 18, borderBottomRightRadius: 18, borderBottomLeftRadius: 18 },
  levelSign: { width: 96, minHeight: 110, padding: 10, borderRadius: 16, alignSelf: 'center', backgroundColor: '#F2F8FF', justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '-8deg' }] },
  signText: { color: '#08438D', fontSize: 19, lineHeight: 24, fontWeight: '800', fontStyle: 'italic', textAlign: 'center' },
  signRule: { width: 34, height: 3, backgroundColor: colors.red, borderRadius: 3, marginTop: 8 },
  celebration: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#FFFFFF20', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  spark: { position: 'absolute', width: 8, height: 8, top: 4, right: 8, backgroundColor: '#FFE297', transform: [{ rotate: '45deg' }] },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  track: { flex: 1, height: 12, borderRadius: 10, backgroundColor: '#77ADEE', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 10, backgroundColor: colors.red },
  percent: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  note: { color: '#E3EEFF', fontSize: 14, lineHeight: 21 },
  recommendation: { gap: 5, borderTopWidth: 1, borderTopColor: '#FFFFFF40', paddingTop: 14 },
  small: { color: '#C8E3FF', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  recommendedTitle: { color: '#FFF', fontSize: 20, lineHeight: 26, fontWeight: '700' },
});
