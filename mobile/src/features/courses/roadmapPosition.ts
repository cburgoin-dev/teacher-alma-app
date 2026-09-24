import type { Roadmap } from './types';
export function roadmapTarget(roadmap: Roadmap): string | null {
  const lessons = roadmap.topics.flatMap(t => t.lessons);
  const completed = roadmap.progress.totalLessons > 0 && roadmap.progress.completedLessons === roadmap.progress.totalLessons;
  if (completed) return [...lessons].reverse().find(l => l.progressStatus === 'COMPLETED')?.id ?? lessons.at(-1)?.id ?? null;
  return lessons.find(l => l.progression.isCurrent)?.id ?? null;
}
export function initialRoadmapOffset(nodeY: number, mapY: number, viewport: number, contentHeight: number) {
  return Math.max(0, Math.min(mapY + nodeY - viewport * .36, contentHeight - viewport));
}
