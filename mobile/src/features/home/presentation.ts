import type { NavigatorScreenParams } from '@react-navigation/native';
import type { CoursesStackParamList } from '../../navigation/types';
import { catalogDestination } from '../courses/presentation';
import type { ActiveHero, HomeCourse, HomeHero } from './types';

export type HomeDestination = NavigatorScreenParams<CoursesStackParamList>;
export const courseDestination = (course: HomeCourse): HomeDestination => ({ screen: catalogDestination(course), params: { courseId: course.id }, initial: false });
export function activeDestination(hero: ActiveHero): HomeDestination | null {
  if (!hero.course || !hero.currentNode || !hero.currentNode.access.hasAccess || hero.currentNode.access.lockReason) return null;
  return hero.currentNode.type === 'LESSON'
    ? { screen: 'Lesson', params: { courseId: hero.course.id, lessonId: hero.currentNode.id }, initial: false }
    : { screen: 'UnitChallenge', params: { courseId: hero.course.id, unitChallengeId: hero.currentNode.id }, initial: false };
}
export const greetingSubtitle: Record<HomeHero['type'], string> = {
  NEW: 'Comienza tu camino en inglés.', ASSESSED: 'Tu próximo paso empieza aquí.',
  ACTIVE: '¿Lista para seguir aprendiendo?', COURSE_COMPLETED: 'Celebra lo aprendido. Sigue creciendo.',
};
export function courseStatus(course: HomeCourse) {
  if (course.status === 'COMING_SOON') return 'Próximamente';
  if (course.progress?.status === 'COMPLETED') return 'Completado';
  if (course.progress) return 'En progreso';
  if (!course.access.hasFullAccess && !course.access.hasFreeContent) return 'Requiere acceso';
  return 'Disponible';
}
