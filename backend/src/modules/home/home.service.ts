import { courseProgress, roadmapNodes } from '../courses/course.progression.js';
import { entitlementSource, isVisible } from '../courses/course.rules.js';
import { courseAccess } from '../courses/course.service.js';
import type { CourseRecord } from '../courses/course.types.js';
import { isReviewEligible } from '../review/review.rules.js';
import type { HomeCourse, HomeHero, HomeRepository, HomeResponse } from './home.types.js';

const identity = (c: CourseRecord) => ({ id: c.id, title: c.title, level: c.level, coverUrl: c.coverUrl });
function progress(c: CourseRecord) {
  const { status, completedRequiredNodes, totalRequiredNodes, percentage } = courseProgress(c);
  return { status, completedRequiredNodes, totalRequiredNodes, percentage };
}
const timestamp = (date: Date | null) => date?.getTime() ?? -Infinity;

export class HomeService {
  constructor(private readonly repository: HomeRepository, private readonly clock: () => Date = () => new Date()) {}
  async read(userId: string): Promise<HomeResponse> {
    const facts = await this.repository.read(userId), now = this.clock();
    const catalog = facts.courses.filter(isVisible).sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
    const project = (c: CourseRecord): HomeCourse => ({ ...identity(c), status: c.status as HomeCourse['status'],
      progress: c.courseProgress.length ? progress(c) : null, access: courseAccess(c, facts.grants, now) });
    const latest = new Map<string, number>();
    for (const completion of facts.completions) latest.set(completion.courseId,
      Math.max(latest.get(completion.courseId) ?? -Infinity, completion.completedAt.getTime()));
    const startedOrder = (a: typeof facts.progress[number], b: typeof facts.progress[number]) =>
      b.startedAt.getTime() - a.startedAt.getTime() || a.courseId.localeCompare(b.courseId);
    const visibleIds = new Set(catalog.map(c => c.id));
    const activeCandidates = facts.progress.filter(p => p.status === 'IN_PROGRESS').sort((a, b) =>
      (latest.get(b.courseId) ?? -Infinity) - (latest.get(a.courseId) ?? -Infinity) || startedOrder(a, b));
    const completedCandidates = facts.progress.filter(p => p.status === 'COMPLETED').sort((a, b) =>
      timestamp(b.completedAt) - timestamp(a.completedAt) || startedOrder(a, b));
    // Prefer visible context without changing state precedence when only hidden progress remains.
    const active = activeCandidates.find(p => visibleIds.has(p.courseId)) ?? activeCandidates[0];
    const completed = completedCandidates.find(p => visibleIds.has(p.courseId)) ?? completedCandidates[0];
    let hero: HomeHero, recommended: CourseRecord | undefined;
    if (active) {
      // Preserve durable state even if editorial changes hide its course; never leak hidden content.
      const course = catalog.find(c => c.id === active.courseId);
      const node = course && roadmapNodes(course, entitlementSource(course.id, facts.grants, now)).find(n => n.progression.isCurrent);
      const topic = course?.topics.find(t => t.id === node?.topicId);
      hero = { type: 'ACTIVE', course: course ? { ...identity(course), progress: progress(course) } : null,
        topic: topic ? { id: topic.id, title: topic.title } : null,
        currentNode: node ? { type: node.type, id: node.id, title: node.title,
          access: { hasAccess: node.access.hasAccess, lockReason: node.access.hasAccess ? null : 'ACCESS' } } : null };
    } else if (completed) {
      const course = catalog.find(c => c.id === completed.courseId);
      recommended = course && catalog.find(c => c.position > course.position);
      hero = { type: 'COURSE_COMPLETED', completedCourse: course ? { ...identity(course),
        completedAt: completed.completedAt?.toISOString() ?? null, progress: progress(course) } : null,
        recommendedCourse: recommended ? project(recommended) : null };
    } else if (facts.diagnostic) {
      const d = facts.diagnostic;
      recommended = catalog.find(c => c.id === d.recommendedCourseId);
      hero = { type: 'ASSESSED', diagnostic: { attemptId: d.id, completedAt: d.completedAt?.toISOString() ?? null,
        recommendedLevel: d.recommendedLevel }, recommendedCourse: recommended ? project(recommended) : null };
    } else {
      const beginner = catalog.find(c => c.status === 'PUBLISHED' && c.level === 'A1');
      hero = { type: 'NEW', beginnerCourse: beginner ? project(beginner) : null };
    }
    const featured = recommended ? [recommended, ...catalog.filter(c => c.id !== recommended.id)] : catalog;
    return { state: hero.type, learner: facts.learner, hero,
      review: { pendingCount: facts.reviewItems.filter(i => isReviewEligible(i, facts.grants, now)).length },
      featuredCourses: featured.slice(0, 2).map(project) };
  }
}
