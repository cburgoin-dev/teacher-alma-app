import type { Lesson, Roadmap } from './types';

export type ProgressTransition = { from: string; to: string; type: Lesson['type'] };
// Ephemeral presentation tickets. Reloading the app cannot replay an animation.
let serial = 0;
let pending: { ticket: number; courseId: string; from: string; type: Lesson['type']; count: number; completed: boolean } | undefined;
export function beginCompletion(roadmap: Roadmap, node: Lesson): number | undefined {
  pending = undefined;
  if (roadmap.currentNode?.id !== node.id || node.progressStatus === 'COMPLETED' || !node.access.hasAccess || !node.progression.unlocked) return;
  const ticket = ++serial;
  pending = { ticket, courseId: roadmap.course.id, from: node.id, type: node.type, count: roadmap.progress.completedRequiredNodes, completed: false };
  return ticket;
}
export function finishCompletion(ticket: number | undefined, progressed: boolean): number | undefined {
  if (!pending || pending.ticket !== ticket) return;
  if (!progressed) { pending = undefined; return; }
  pending.completed = true;
  return ticket;
}
export function consumeCompletion(ticket: number | undefined, roadmap: Roadmap): ProgressTransition | null {
  const candidate = pending;
  pending = undefined;
  if (!candidate || candidate.ticket !== ticket || !candidate.completed || candidate.courseId !== roadmap.course.id) return null;
  const nodes = roadmap.topics.flatMap(t => t.nodes);
  const index = nodes.findIndex(n => n.id === candidate.from && n.type === candidate.type);
  const from = nodes[index], to = nodes[index + 1];
  if (!from || from.progressStatus !== 'COMPLETED' || !to || roadmap.currentNode?.id !== to.id || !to.progression.unlocked || roadmap.progress.completedRequiredNodes <= candidate.count) return null;
  return { from: from.id, to: to.id, type: from.type };
}
export const TRAVEL_MS = 3500;
export const ARRIVAL_MS = 450;
export const COMPLETION_MS = 1300;
export const SETTLE_MS = 275;
export const REVEAL_MS = 1100;
export const TRAVEL_END = TRAVEL_MS / (TRAVEL_MS + ARRIVAL_MS);
export function motionDuration(reducedMotion: boolean) { return reducedMotion ? 0 : COMPLETION_MS + SETTLE_MS + TRAVEL_MS + ARRIVAL_MS + REVEAL_MS; }
