import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import BookOpen from 'lucide-react-native/icons/book-open';
import Trophy from 'lucide-react-native/icons/trophy';
import { Button } from '../../courses/components/ui';
import { CourseCover } from '../../courses/components/CourseCover';
import { activeDestination, courseDestination, courseStatus, type HomeDestination } from '../presentation';
import type { HomeCourse, HomeHero, HomeIdentity } from '../types';
import { colors, shadows } from '../../../theme';

export function HomeHeroCard({ hero, onNavigate }: { hero: HomeHero; onNavigate: (destination: HomeDestination) => void }) {
  const { width, fontScale } = useWindowDimensions();
  const artVisible = width >= 350 && fontScale < 1.3;
  let eyebrow: string, title: string, detail: string | null = null, course: HomeIdentity | null = null;
  let percentage: number | null = null, destination: HomeDestination | null = null, cta: string | null = null;
  let recommendation: HomeCourse | null = null, note: string | null = null;
  switch (hero.type) {
    case 'NEW':
      eyebrow = 'TU PRIMER PASO'; title = 'Descubre tu nivel';
      detail = 'Un diagnóstico corto te ayudará a encontrar por dónde empezar.';
      note = 'Diagnóstico disponible próximamente. Mientras tanto, puedes explorar los cursos.';
      break;
    case 'ASSESSED':
      eyebrow = 'TU PUNTO DE PARTIDA'; title = hero.diagnostic.recommendedLevel ? `Tu nivel recomendado: ${hero.diagnostic.recommendedLevel}` : 'Tu diagnóstico está listo';
      recommendation = hero.recommendedCourse; course = recommendation;
      detail = recommendation ? 'Este es el curso recomendado para ti.' : 'Explora los cursos y elige tu próximo paso.';
      break;
    case 'ACTIVE':
      eyebrow = 'CONTINUAR APRENDIENDO'; course = hero.course;
      title = hero.currentNode?.title ?? hero.course?.title ?? 'Tu aprendizaje sigue aquí';
      detail = hero.topic?.title ?? null;
      percentage = hero.course?.progress.percentage ?? null;
      destination = activeDestination(hero); cta = destination ? 'Continuar' : null;
      if (!hero.course || !hero.currentNode) note = 'Tu siguiente paso no está disponible en este momento. Puedes explorar los cursos.';
      else if (!destination) note = 'Este paso requiere acceso al curso. Tu avance se conserva.';
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
    <View pointerEvents="none" accessible={false} style={s.glow} />
    <Text style={s.eyebrow}>{eyebrow}</Text>
    <View style={s.heroRow}>
      <View style={s.copy}>
        {hero.type === 'ACTIVE' && course ? <Text style={s.courseBadge}>{course.title}</Text> : null}
        {hero.type === 'ACTIVE' && detail ? <Text style={s.detail}>{detail}</Text> : null}
        <Text accessibilityRole="header" style={s.title}>{title}</Text>
        {hero.type !== 'ACTIVE' && detail ? <Text style={s.detail}>{detail}</Text> : null}
        {hero.type === 'ACTIVE' && hero.currentNode?.type === 'UNIT_CHALLENGE' ? <Text style={s.nodeKind}>Reto de unidad</Text> : null}
      </View>
      {artVisible ? course ? <CourseCover uri={course.coverUrl} level={course.level} hero style={s.cover} />
        : <View accessible={false} style={s.symbol}>{hero.type === 'COURSE_COMPLETED' ? <Trophy color="#FFF" size={44} /> : <BookOpen color="#FFF" size={44} />}</View> : null}
    </View>
    {percentage !== null ? <View style={s.progress} accessibilityRole="progressbar" accessibilityLabel="Progreso del curso" accessibilityValue={{ min: 0, max: 100, now: percentage }}>
      <View style={s.track}><View style={[s.fill, { width: `${Math.max(0, Math.min(100, percentage))}%` }]} /></View><Text style={s.percent}>{percentage}%</Text>
    </View> : null}
    {recommendation ? <View style={s.recommendation}><Text style={s.small}>TU PRÓXIMO CURSO</Text><Text style={s.recommendedTitle}>{recommendation.title}</Text><Text style={s.detail}>{courseStatus(recommendation)}</Text></View> : null}
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
  cover: { width: '29%', minHeight: 150, borderTopLeftRadius: 50, borderTopRightRadius: 18, borderBottomRightRadius: 18, borderBottomLeftRadius: 18 },
  symbol: { width: 76, height: 96, borderRadius: 24, alignSelf: 'center', backgroundColor: '#3489F1', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '8deg' }] },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  track: { flex: 1, height: 12, borderRadius: 10, backgroundColor: '#77ADEE', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 10, backgroundColor: colors.red },
  percent: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  note: { color: '#E3EEFF', fontSize: 14, lineHeight: 21 },
  recommendation: { gap: 5, borderTopWidth: 1, borderTopColor: '#FFFFFF40', paddingTop: 14 },
  small: { color: '#C8E3FF', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  recommendedTitle: { color: '#FFF', fontSize: 20, lineHeight: 26, fontWeight: '700' },
});
