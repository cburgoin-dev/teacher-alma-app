import type { CourseRecord, CourseRepository, EntitlementRecord, LessonRecord } from './course.types.js';

export const userId = '550e8400-e29b-41d4-a716-446655440010';
export const courseId = '550e8400-e29b-41d4-a716-446655440000';
export const now = new Date('2026-01-15T12:00:00Z');

export function lesson(position: number, overrides: Partial<LessonRecord> = {}): LessonRecord {
  return { id: `550e8400-e29b-41d4-a716-${String(position).padStart(12, '0')}`,
    title: `Lesson ${position}`, position, status: 'PUBLISHED', isRequired: true,
    accessType: 'FREE', lessonProgress: [], ...overrides };
}

export function course(overrides: Partial<CourseRecord> = {}): CourseRecord {
  return { id: courseId, title: 'Course', slug: 'course', level: 'A1', description: null,
    coverUrl: null, status: 'PUBLISHED', position: 1, courseProgress: [],
    topics: [{ id: 'topic-1', title: 'Topic 1', position: 1, lessons: [lesson(1), lesson(2)] }], ...overrides };
}

/** In-memory test double; no database connection, secrets, or real writes. */
export class MemoryCourses implements CourseRepository {
  readonly starts = new Map<string, { status: string }>();
  writes = 0;
  constructor(public courses = [course()], public grants: EntitlementRecord[] = []) {}
  private snapshot(value: CourseRecord, user: string) {
    const copy = structuredClone(value);
    const stored = this.starts.get(`${user}/${value.id}`);
    if (stored) copy.courseProgress = [stored];
    return copy;
  }
  async findCourses(user: string) { return this.courses.map(c => this.snapshot(c, user)); }
  async findCourse(id: string, user: string) {
    const found = this.courses.find(c => c.id === id);
    return found ? this.snapshot(found, user) : null;
  }
  async findEntitlements(_user: string) { return structuredClone(this.grants); }
  async createProgressOnce(id: string, user: string) {
    const key = `${user}/${id}`;
    let record = this.starts.get(key);
    if (!record) { record = { status: 'IN_PROGRESS' }; this.starts.set(key, record); this.writes++; }
    return record;
  }
}
