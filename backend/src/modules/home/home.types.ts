import type { CourseRecord, EntitlementRecord } from '../courses/course.types.js';
import type { ReviewEligibilityRecord } from '../review/review.rules.js';
import type { courseAccess } from '../courses/course.service.js';

export interface HomeFacts {
  learner: { displayName: string | null };
  courses: CourseRecord[];
  grants: EntitlementRecord[];
  progress: { courseId: string; status: string; startedAt: Date; completedAt: Date | null }[];
  completions: { courseId: string; completedAt: Date }[];
  diagnostic: { id: string; completedAt: Date | null; recommendedLevel: string | null; recommendedCourseId: string | null } | null;
  reviewItems: ReviewEligibilityRecord[];
}
export interface HomeRepository { read(userId: string): Promise<HomeFacts> }
type Progress = { status: 'IN_PROGRESS' | 'COMPLETED'; completedRequiredNodes: number; totalRequiredNodes: number; percentage: number };
type Identity = { id: string; title: string; level: string | null; coverUrl: string | null };
export type HomeCourse = Identity & { description: string | null; status: 'PUBLISHED' | 'COMING_SOON'; progress: Progress | null; access: ReturnType<typeof courseAccess> };
export type HomeCurrentNode = { type: 'LESSON' | 'UNIT_CHALLENGE'; id: string; title: string; access: { hasAccess: boolean; lockReason: 'ACCESS' | null } };
export type HomeHero =
  | { type: 'NEW'; beginnerCourse: HomeCourse | null }
  | { type: 'ASSESSED'; diagnostic: { attemptId: string; completedAt: string | null; recommendedLevel: string | null }; recommendedCourse: HomeCourse | null }
  | { type: 'ACTIVE'; course: (Identity & { progress: Progress }) | null; topic: { id: string; title: string } | null; currentNode: HomeCurrentNode | null }
  | { type: 'COURSE_COMPLETED'; completedCourse: (Identity & { completedAt: string | null; progress: Progress }) | null; recommendedCourse: HomeCourse | null };
export type HomeResponse = { state: HomeHero['type']; learner: HomeFacts['learner']; hero: HomeHero; review: { pendingCount: number }; featuredCourses: HomeCourse[] };
