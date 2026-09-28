import { HttpError } from '../../shared/http-error.js';
import { entitlementSource, hasLessonAccess, isVisible, requireStartableStatus, requireVisible } from './course.rules.js';
import { courseProgress, nextNode, progressionPath, relevantTopics, roadmapNodes } from './course.progression.js';
import type { CourseRecord, CourseRepository, EntitlementRecord } from './course.types.js';

function identity(course: CourseRecord) { return { id: course.id, title: course.title, level: course.level }; }
function description(course: CourseRecord) {
  return { ...identity(course), slug: course.slug, description: course.description, coverUrl: course.coverUrl, status: course.status };
}
function access(course: CourseRecord, grants: EntitlementRecord[], now: Date) {
  const nodes = progressionPath(course);
  const source = nodes.length && nodes.every(n => n.accessType === 'FREE') ? 'FREE' as const : entitlementSource(course.id, grants, now);
  return { hasFullAccess: source !== 'NONE', hasFreeContent: nodes.some(n => n.accessType === 'FREE'), source };
}

export class CourseService {
  constructor(private readonly repository: CourseRepository, private readonly clock: () => Date = () => new Date()) {}
  async list(userId: string) {
    const [courses, grants] = await Promise.all([this.repository.findCourses(userId), this.repository.findEntitlements(userId)]);
    return { courses: courses.filter(isVisible).sort((a, b) => a.position - b.position).map(course => ({
      ...description(course), position: course.position,
      progress: course.courseProgress.length ? courseProgress(course) : null, access: access(course, grants, this.clock()),
    })) };
  }
  async detail(courseId: string, userId: string) {
    const course = requireVisible(await this.repository.findCourse(courseId, userId));
    const topics = relevantTopics(course), lessons = topics.flatMap(t => t.lessons);
    return { ...description(course), content: { topicCount: topics.length, lessonCount: lessons.length,
      freeLessonCount: lessons.filter(l => l.accessType === 'FREE').length, unitChallengeCount: topics.filter(t => t.unitChallenge).length },
      progress: course.courseProgress.length ? courseProgress(course) : null,
      access: access(course, await this.repository.findEntitlements(userId), this.clock()) };
  }
  async roadmap(courseId: string, userId: string) {
    const course = requireVisible(await this.repository.findCourse(courseId, userId));
    const source = entitlementSource(courseId, await this.repository.findEntitlements(userId), this.clock());
    const nodes = roadmapNodes(course, source), current = nodes.find(n => n.progression.isCurrent);
    const { status: _status, ...progress } = courseProgress(course);
    return { course: identity(course), progress, currentNode: current ? { type: current.type, id: current.id } : null,
      topics: relevantTopics(course).map(t => ({ id: t.id, title: t.title, position: t.position,
        nodes: nodes.filter(n => n.topicId === t.id).map(({ topicId: _topicId, ...node }) => node) })) };
  }
  async start(courseId: string, userId: string) {
    const course = requireVisible(await this.repository.findCourse(courseId, userId));
    requireStartableStatus(course);
    const path = progressionPath(course);
    const frontier = path.find(n => n.required && n.progressStatus !== 'COMPLETED');
    const first = frontier ?? path.find(n => n.required) ?? path[0];
    if (!first) throw new HttpError(409, 'COURSE_HAS_NO_CONTENT', 'Course has no available content');
    const source = entitlementSource(courseId, await this.repository.findEntitlements(userId), this.clock());
    if (!first.active && !hasLessonAccess(first, source)) throw new HttpError(403, 'COURSE_ACCESS_REQUIRED', 'Access to this course is required');
    if (!course.courseProgress.length) await this.repository.createProgressOnce(courseId, userId);
    const next = nextNode(course, source);
    return { course: identity(course), progress: courseProgress(course),
      nextNode: next ? { type: next.type, id: next.id, title: next.title } : null };
  }
}
