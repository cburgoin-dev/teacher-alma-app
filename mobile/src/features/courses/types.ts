export type Progress = { status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'; completedLessons: number; totalLessons: number; percentage: number };
export type Course = {
  id: string; title: string; slug: string; level: string | null; description: string | null;
  coverUrl: string | null; status: 'PUBLISHED' | 'COMING_SOON';
  progress: Progress | null;
  access: { hasFullAccess: boolean; hasFreeContent: boolean; source: 'FREE' | 'SUBSCRIPTION' | 'COURSE_PURCHASE' | 'NONE' };
};
export type CatalogCourse = Course & { position: number };
export type CourseDetail = Course & { content: { topicCount: number; lessonCount: number; freeLessonCount: number } };
export type Lesson = {
  id: string; title: string; position: number; progressStatus: Progress['status'];
  access: { type: 'FREE' | 'PAID'; hasAccess: boolean };
  progression: { unlocked: boolean; isCurrent: boolean; lockReason: 'PREREQUISITE' | 'ACCESS' | null };
};
export type Roadmap = {
  course: Pick<Course, 'id' | 'title' | 'level'>;
  progress: Omit<Progress, 'status'>;
  topics: { id: string; title: string; position: number; lessons: Lesson[] }[];
};
export type StartResponse = { course: Roadmap['course']; progress: Progress; nextLesson: { id: string; title: string } | null };
