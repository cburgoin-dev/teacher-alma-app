import type { LearningStackParamList } from '../../navigation/types';
import { catalogDestination } from '../courses/presentation';
import type { ActiveHero, HomeCourse, HomeHero } from './types';
export type HomeDestination = { screen: 'Courses' } | {
  [K in 'CourseDetail' | 'Roadmap' | 'Review']: { screen: K; params: LearningStackParamList[K] }
}['CourseDetail' | 'Roadmap' | 'Review'];
export const courseDestination = (course: HomeCourse): HomeDestination => ({ screen: catalogDestination(course), params: { courseId: course.id } });
export function activeDestination(hero: ActiveHero): HomeDestination | null {
  if (!hero.course || !hero.currentNode) return null;
  return { screen: 'Roadmap', params: { courseId: hero.course.id, focusNode: { id: hero.currentNode.id, type: hero.currentNode.type } } };
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
