export interface LearnerCourseProgress {
  courseId: string; status: string; startedAt: Date; completedAt: Date | null;
}
export interface CourseCompletion { courseId: string; completedAt: Date }

/** Shared durable-learning ordering. Callers decide how to present hidden-only context. */
export function orderedCourseCandidates(progress: LearnerCourseProgress[], completions: CourseCompletion[]) {
  const latest = new Map<string, number>();
  for (const completion of completions) latest.set(completion.courseId,
    Math.max(latest.get(completion.courseId) ?? -Infinity, completion.completedAt.getTime()));
  const startedOrder = (a: LearnerCourseProgress, b: LearnerCourseProgress) =>
    b.startedAt.getTime() - a.startedAt.getTime() || a.courseId.localeCompare(b.courseId);
  return {
    activeCandidates: progress.filter(p => p.status === 'IN_PROGRESS').sort((a, b) =>
      (latest.get(b.courseId) ?? -Infinity) - (latest.get(a.courseId) ?? -Infinity) || startedOrder(a, b)),
    completedCandidates: progress.filter(p => p.status === 'COMPLETED').sort((a, b) =>
      (b.completedAt?.getTime() ?? -Infinity) - (a.completedAt?.getTime() ?? -Infinity) || startedOrder(a, b)),
  };
}
