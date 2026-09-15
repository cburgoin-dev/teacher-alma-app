import { HttpError } from '../../shared/http-error.js';
import { entitlementSource, hasLessonAccess, isVisible, requireStartableStatus, requireVisible } from './course.rules.js';
import type { CourseRecord, CourseRepository, EntitlementRecord, LessonRecord } from './course.types.js';

function relevantTopics(course: CourseRecord) {
  return course.topics.map(topic => ({
    ...topic,
    lessons: topic.lessons.filter(lesson => lesson.status === 'PUBLISHED')
      .sort((a, b) => a.position - b.position),
  })).filter(topic => topic.lessons.length > 0).sort((a, b) => a.position - b.position);
}

function completion(lessons: LessonRecord[]) {
  const completedLessons = lessons.filter(isCompleted).length;
  const totalLessons = lessons.length;
  return { completedLessons, totalLessons, percentage: totalLessons === 0 ? 0 : completedLessons / totalLessons * 100 };
}

function isCompleted(lesson: LessonRecord) {
  return lesson.lessonProgress[0]?.status === 'COMPLETED';
}

function progress(lessons: LessonRecord[]) {
  const counts = completion(lessons);
  return { status: counts.totalLessons > 0 && counts.completedLessons === counts.totalLessons
    ? 'COMPLETED' as const : 'IN_PROGRESS' as const, ...counts };
}

function identity(course: CourseRecord) {
  return { id: course.id, title: course.title, level: course.level };
}

function description(course: CourseRecord) {
  return { ...identity(course), slug: course.slug, description: course.description,
    coverUrl: course.coverUrl, status: course.status };
}

function access(course: CourseRecord, lessons: LessonRecord[], grants: EntitlementRecord[], now: Date) {
  const source = lessons.length > 0 && lessons.every(lesson => lesson.accessType === 'FREE')
    ? 'FREE' as const : entitlementSource(course.id, grants, now);
  return { hasFullAccess: source !== 'NONE', hasFreeContent: lessons.some(lesson => lesson.accessType === 'FREE'), source };
}

export class CourseService {
  constructor(private readonly repository: CourseRepository, private readonly clock: () => Date = () => new Date()) {}

  async list(userId: string) {
    const [courses, grants] = await Promise.all([
      this.repository.findCourses(userId), this.repository.findEntitlements(userId),
    ]);
    const now = this.clock();
    return { courses: courses.filter(isVisible).sort((a, b) => a.position - b.position).map(course => {
      const lessons = relevantTopics(course).flatMap(topic => topic.lessons);
      return { ...description(course), position: course.position,
        progress: course.courseProgress.length ? progress(lessons) : null,
        access: access(course, lessons, grants, now) };
    }) };
  }

  async detail(courseId: string, userId: string) {
    const course = requireVisible(await this.repository.findCourse(courseId, userId));
    const topics = relevantTopics(course);
    const lessons = topics.flatMap(topic => topic.lessons);
    const grants = await this.repository.findEntitlements(userId);
    return { ...description(course),
      content: { topicCount: topics.length, lessonCount: lessons.length,
        freeLessonCount: lessons.filter(lesson => lesson.accessType === 'FREE').length },
      progress: course.courseProgress.length ? progress(lessons) : null,
      access: access(course, lessons, grants, this.clock()) };
  }

  async roadmap(courseId: string, userId: string) {
    const course = requireVisible(await this.repository.findCourse(courseId, userId));
    const topics = relevantTopics(course);
    const lessons = topics.flatMap(topic => topic.lessons);
    const source = entitlementSource(courseId, await this.repository.findEntitlements(userId), this.clock());
    const next = lessons.find(lesson => !isCompleted(lesson));
    let precedingCompleted = true;
    return { course: identity(course), progress: completion(lessons), topics: topics.map(topic => ({
      id: topic.id, title: topic.title, position: topic.position,
      lessons: topic.lessons.map(lesson => {
        const completed = isCompleted(lesson);
        const unlocked = completed || precedingCompleted;
        const hasAccess = hasLessonAccess(lesson, source);
        precedingCompleted = precedingCompleted && completed;
        return { id: lesson.id, title: lesson.title, position: lesson.position,
          progressStatus: lesson.lessonProgress[0]?.status ?? 'NOT_STARTED',
          access: { type: lesson.accessType, hasAccess },
          progression: { unlocked,
            isCurrent: course.courseProgress.length > 0 && lesson.id === next?.id,
            lockReason: !unlocked ? 'PREREQUISITE' : !hasAccess ? 'ACCESS' : null } };
      }),
    })) };
  }

  async start(courseId: string, userId: string) {
    const course = requireVisible(await this.repository.findCourse(courseId, userId));
    requireStartableStatus(course);
    const lessons = relevantTopics(course).flatMap(topic => topic.lessons);
    const first = lessons[0];
    if (!first) throw new HttpError(409, 'COURSE_HAS_NO_CONTENT', 'Course has no available content');
    const source = entitlementSource(courseId, await this.repository.findEntitlements(userId), this.clock());
    if (!hasLessonAccess(first, source)) {
      throw new HttpError(403, 'COURSE_ACCESS_REQUIRED', 'Access to this course is required');
    }
    if (!course.courseProgress.length) await this.repository.createProgressOnce(courseId, userId);
    const next = lessons.find(lesson => !isCompleted(lesson));
    return { course: identity(course), progress: progress(lessons),
      nextLesson: next ? { id: next.id, title: next.title } : null };
  }
}
