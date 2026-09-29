export type Progress = { status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'; completedLessons: number; totalLessons: number; percentage: number;
  completedUnitChallenges: number; totalUnitChallenges: number; completedRequiredNodes: number; totalRequiredNodes: number };
export type Course = {
  id: string; title: string; slug: string; level: string | null; description: string | null;
  coverUrl: string | null; status: 'PUBLISHED' | 'COMING_SOON';
  progress: Progress | null;
  access: { hasFullAccess: boolean; hasFreeContent: boolean; source: 'FREE' | 'SUBSCRIPTION' | 'COURSE_PURCHASE' | 'NONE' };
};
export type CatalogCourse = Course & { position: number };
export type CourseDetail = Course & { content: { topicCount: number; lessonCount: number; freeLessonCount: number; unitChallengeCount: number } };
export type Lesson = {
  type: 'LESSON' | 'UNIT_CHALLENGE'; required: boolean;
  id: string; title: string; position: number; progressStatus: Progress['status'];
  access: { type: 'FREE' | 'PAID'; hasAccess: boolean };
  progression: { unlocked: boolean; isCurrent: boolean; lockReason: 'PREREQUISITE' | 'ACCESS' | null };
};
export type Roadmap = {
  course: Pick<Course, 'id' | 'title' | 'level'>;
  progress: Omit<Progress, 'status'>;
  currentNode: { type: Lesson['type']; id: string } | null;
  topics: { id: string; title: string; position: number; nodes: Lesson[] }[];
};
export type NextNode = { type: Lesson['type']; id: string; title: string; accessible: boolean; lockReason: 'PREREQUISITE' | 'ACCESS' | null };
export type StartResponse = { course: Roadmap['course']; progress: Progress; nextNode: Pick<NextNode, 'type' | 'id' | 'title'> | null };
