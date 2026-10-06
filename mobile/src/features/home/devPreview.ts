import type { HomeCourse, HomeHero, HomeResponse } from './types';

export type HomePreviewMode = 'REAL' | HomeHero['type'];
export const homePreviewModes: HomePreviewMode[] = ['REAL', 'NEW', 'ASSESSED', 'ACTIVE', 'COURSE_COMPLETED'];
// Visual snapshots only. Synthetic IDs must never enter learning navigation.
const a1: HomeCourse = { id: 'dev-preview-a1', title: 'Inglés A1', description: 'Bases para comunicarte en situaciones reales.', level: 'A1', coverUrl: null, status: 'PUBLISHED', progress: null, access: { hasFullAccess: false, hasFreeContent: true, source: 'NONE' } };
const a2: HomeCourse = { ...a1, id: 'dev-preview-a2', title: 'Inglés A2', level: 'A2', description: 'Comunícate con confianza en más situaciones.' };
const progress = { status: 'IN_PROGRESS' as const, completedRequiredNodes: 4, totalRequiredNodes: 12, percentage: 33 };
const completed = { ...progress, status: 'COMPLETED' as const, completedRequiredNodes: 12, percentage: 100 };
const response = (hero: HomeHero, courses: HomeCourse[] = [a1, a2]): HomeResponse => ({ state: hero.type, learner: { displayName: 'Sofía' }, hero, review: { pendingCount: 0 }, featuredCourses: courses });
export const homePreviewFixtures: Record<HomeHero['type'], HomeResponse> = {
  NEW: response({ type: 'NEW', beginnerCourse: a1 }),
  ASSESSED: response({ type: 'ASSESSED', diagnostic: { attemptId: 'dev-preview-diagnostic', completedAt: null, recommendedLevel: 'A2' }, recommendedCourse: a2 }),
  ACTIVE: response({ type: 'ACTIVE', course: { ...a1, progress }, topic: { id: 'dev-preview-topic', title: 'Familia y amigos' }, currentNode: { type: 'LESSON', id: 'dev-preview-lesson', title: 'Verb to be', access: { hasAccess: true, lockReason: null } } }, [{ ...a1, progress }, a2]),
  COURSE_COMPLETED: response({ type: 'COURSE_COMPLETED', completedCourse: { ...a1, progress: completed, completedAt: null }, recommendedCourse: a2 }, [{ ...a1, progress: completed }, a2]),
};
export function previewHomeData(real: HomeResponse | null, mode: HomePreviewMode, development: boolean): HomeResponse | null {
  return development && mode !== 'REAL' ? homePreviewFixtures[mode] : real;
}
