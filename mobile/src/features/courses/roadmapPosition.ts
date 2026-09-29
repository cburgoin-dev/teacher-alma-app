import type { Roadmap } from './types';
export function roadmapTarget(roadmap: Roadmap): string | null {
  const lessons = roadmap.topics.flatMap(t => t.nodes);
  const completed = roadmap.progress.totalRequiredNodes > 0 && roadmap.progress.completedRequiredNodes === roadmap.progress.totalRequiredNodes;
  if (completed) return [...lessons].reverse().find(l => l.progressStatus === 'COMPLETED')?.id ?? lessons.at(-1)?.id ?? null;
  return roadmap.currentNode?.id ?? null;
}
export function initialRoadmapOffset(nodeY: number, mapY: number, viewport: number, contentHeight: number) {
  return Math.max(0, Math.min(mapY + nodeY - viewport * .36, contentHeight - viewport));
}
