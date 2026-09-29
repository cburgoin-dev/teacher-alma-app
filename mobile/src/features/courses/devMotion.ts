import type { Roadmap } from './types';
import type { ProgressTransition } from './completionMotion';

// Only imported in the __DEV__ branch. No API calls, tickets or mutations.
export function devReplayTransition(roadmap: Roadmap): ProgressTransition | null {
  const nodes = roadmap.topics.flatMap(topic => topic.nodes);
  const index = nodes.findIndex(node => node.id === roadmap.currentNode?.id);
  const from = nodes[index - 1], to = nodes[index];
  return from?.progressStatus === 'COMPLETED' && to?.progression.unlocked
    ? { from: from.id, to: to.id, type: from.type } : null;
}
