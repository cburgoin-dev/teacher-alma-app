import type { CourseRecord } from './course.types.js';
import { hasLessonAccess, type entitlementSource } from './course.rules.js';

type Structure = Pick<CourseRecord, 'topics' | 'courseProgress'>;
export function relevantTopics(course: Structure) {
  return course.topics.map(t => ({ ...t,
    lessons: t.lessons.filter(l => l.status === 'PUBLISHED').sort((a, b) => a.position - b.position),
    unitChallenge: t.unitChallenge?.status === 'PUBLISHED' ? t.unitChallenge : null,
  })).filter(t => t.lessons.length || t.unitChallenge).sort((a, b) => a.position - b.position);
}

/** One curricular path for Courses, Lessons and Unit Challenge. Optional nodes never gate it. */
export function progressionPath(course: Structure) {
  return relevantTopics(course).flatMap(t => [
    ...t.lessons.map(l => ({ type: 'LESSON' as const, id: l.id, title: l.title, topicId: t.id,
      position: l.position, required: l.isRequired, accessType: l.accessType,
      progressStatus: l.lessonProgress[0]?.status ?? 'NOT_STARTED', active: false })),
    ...(t.unitChallenge ? [{ type: 'UNIT_CHALLENGE' as const, id: t.unitChallenge.id,
      title: t.unitChallenge.title, topicId: t.id, position: Math.max(0, ...t.lessons.map(l => l.position)) + 1,
      required: true, accessType: t.unitChallenge.accessType, active: t.unitChallenge.runs.length > 0,
      progressStatus: t.unitChallenge.progress.length ? 'COMPLETED' : t.unitChallenge.runs.length ? 'IN_PROGRESS' : 'NOT_STARTED',
    }] : []),
  ]);
}

export function courseProgress(course: Structure) {
  const required = progressionPath(course).filter(n => n.required);
  const lessons = required.filter(n => n.type === 'LESSON');
  const challenges = required.filter(n => n.type === 'UNIT_CHALLENGE');
  const completedLessons = lessons.filter(n => n.progressStatus === 'COMPLETED').length;
  const completedUnitChallenges = challenges.filter(n => n.progressStatus === 'COMPLETED').length;
  const completedRequiredNodes = completedLessons + completedUnitChallenges;
  const totalRequiredNodes = required.length;
  return { completedLessons, totalLessons: lessons.length, completedUnitChallenges, totalUnitChallenges: challenges.length,
    completedRequiredNodes, totalRequiredNodes,
    percentage: totalRequiredNodes ? completedRequiredNodes === totalRequiredNodes ? 100
      : Math.min(99, Math.round(completedRequiredNodes / totalRequiredNodes * 100)) : 0,
    status: totalRequiredNodes > 0 && completedRequiredNodes === totalRequiredNodes ? 'COMPLETED' as const : 'IN_PROGRESS' as const };
}

export function roadmapNodes(course: Structure, source: ReturnType<typeof entitlementSource>) {
  const path = progressionPath(course);
  const current = path.find(n => n.required && n.progressStatus !== 'COMPLETED');
  let beforeComplete = true;
  return path.map(n => {
    const completed = n.progressStatus === 'COMPLETED';
    const unlocked = n.active || completed || beforeComplete;
    const hasAccess = n.active || hasLessonAccess(n, source);
    if (n.required) beforeComplete = beforeComplete && completed;
    return { type: n.type, id: n.id, title: n.title, topicId: n.topicId, position: n.position, required: n.required,
      progressStatus: n.progressStatus, access: { type: n.accessType, hasAccess },
      progression: { unlocked, isCurrent: course.courseProgress.length > 0 && current?.id === n.id && current.type === n.type,
        lockReason: !unlocked ? 'PREREQUISITE' as const : !hasAccess ? 'ACCESS' as const : null } };
  });
}

export function nextNode(course: Structure, source: ReturnType<typeof entitlementSource>) {
  const node = roadmapNodes(course, source).find(n => n.required && n.progressStatus !== 'COMPLETED');
  return node ? { type: node.type, id: node.id, title: node.title,
    accessible: node.progression.unlocked && node.access.hasAccess, lockReason: node.progression.lockReason } : null;
}
