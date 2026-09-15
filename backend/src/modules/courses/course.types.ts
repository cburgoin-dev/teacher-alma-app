/** Persistence projections used by Courses, never raw API responses. */
export interface LessonRecord {
  id: string;
  title: string;
  position: number;
  status: string;
  isRequired: boolean;
  accessType: string;
  lessonProgress: { status: string }[];
}

export interface TopicRecord {
  id: string;
  title: string;
  position: number;
  lessons: LessonRecord[];
}

export interface CourseProgressRecord {
  status: string;
}

export interface CourseRecord {
  id: string;
  title: string;
  slug: string;
  level: string | null;
  description: string | null;
  coverUrl: string | null;
  status: string;
  position: number;
  topics: TopicRecord[];
  courseProgress: CourseProgressRecord[];
}

export interface EntitlementRecord {
  scope: string;
  courseId: string | null;
  status: string;
  startsAt: Date;
  expiresAt: Date | null;
}

export interface CourseRepository {
  findCourses(userId: string): Promise<CourseRecord[]>;
  findCourse(courseId: string, userId: string): Promise<CourseRecord | null>;
  findEntitlements(userId: string): Promise<EntitlementRecord[]>;
  createProgressOnce(courseId: string, userId: string): Promise<CourseProgressRecord>;
}
