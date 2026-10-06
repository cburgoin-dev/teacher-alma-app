import type { Roadmap } from './types';
export function roadmapTarget(roadmap: Roadmap, focusNode?: { id: string; type: 'LESSON' | 'UNIT_CHALLENGE' }): string | null {
  const lessons = roadmap.topics.flatMap(t => t.nodes);
  const completed = roadmap.progress.totalRequiredNodes > 0 && roadmap.progress.completedRequiredNodes === roadmap.progress.totalRequiredNodes;
  if (completed) return [...lessons].reverse().find(l => l.progressStatus === 'COMPLETED')?.id ?? lessons.at(-1)?.id ?? null;
  // Home supplies only an entry hint. Never focus a stale or differently typed frontier.
  if (focusNode && roadmap.currentNode?.id === focusNode.id && roadmap.currentNode.type === focusNode.type
    && lessons.some(node => node.id === focusNode.id && node.type === focusNode.type)) return focusNode.id;
  return roadmap.currentNode?.id ?? null;
}
export function initialRoadmapOffset(nodeY: number, mapY: number, viewport: number, contentHeight: number) {
  return Math.max(0, Math.min(mapY + nodeY - viewport * .36, contentHeight - viewport));
}

// Keep the bus near the upper-middle; native travel drives this offset each frame.
export function motionViewportOffset(busY: number, mapY: number, viewport: number, contentHeight: number): number {
  return Math.max(0, Math.min(mapY + busY - viewport * .42, Math.max(0, contentHeight - viewport)));
}
