import type { Course, CourseDetail, Lesson, Roadmap } from './types';

// Presentation only: the server remains authoritative for access and progression.
export function catalogDestination(course: Course): 'CourseDetail' | 'Roadmap' {
  if (course.status === 'COMING_SOON') return 'CourseDetail';
  if (course.progress?.status === 'IN_PROGRESS' || course.progress?.status === 'COMPLETED') return 'Roadmap';
  return 'CourseDetail';
}
export function catalogLabel(course: Course): string {
  if (course.status === 'COMING_SOON') return 'Próximamente';
  if (course.progress?.status === 'COMPLETED') return 'Repasar';
  if (course.progress?.status === 'IN_PROGRESS') return 'Continuar';
  if (!course.access.hasFullAccess && !course.access.hasFreeContent) return 'Ver acceso';
  return 'Comenzar';
}
export function detailAction(course: CourseDetail, roadmap: Roadmap): 'SOON' | 'EMPTY' | 'ROUTE' | 'ACCESS' | 'START' {
  if (course.status === 'COMING_SOON') return 'SOON';
  const firstLesson = roadmap.topics.flatMap(topic => topic.lessons)[0];
  if (!firstLesson) return 'EMPTY';
  if (course.progress && course.progress.status !== 'NOT_STARTED') return 'ROUTE';
  return firstLesson.access.hasAccess ? 'START' : 'ACCESS';
}
export function lessonState(lesson: Lesson) {
  if (lesson.progression.lockReason === 'PREREQUISITE') return 'LOCKED_PREREQUISITE';
  if (lesson.progression.lockReason === 'ACCESS' || !lesson.access.hasAccess) return 'LOCKED_ACCESS';
  if (lesson.progressStatus === 'COMPLETED') return 'COMPLETED';
  if (lesson.progression.isCurrent) return 'CURRENT';
  return 'AVAILABLE';
}
export const lessonLabels = {
  COMPLETED: 'Completada', CURRENT: 'Tu siguiente lección', AVAILABLE: 'Disponible',
  LOCKED_PREREQUISITE: 'Completa la lección anterior', LOCKED_ACCESS: 'Requiere acceso',
};
