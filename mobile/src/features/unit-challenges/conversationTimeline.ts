import type { Conversation } from './types';
export type ChatFrame = { at: number; visible: number; typing: string | null; latest: string | null; done: boolean };
export function conversationTimeline(steps: Conversation['steps'], start: number, end: number, reduced: boolean): ChatFrame[] {
  if (reduced) return [{ at: 0, visible: end, typing: null, latest: null, done: true }];
  const frames: ChatFrame[] = [];
  let time = 0;
  for (let index = start; index < end; index++) {
    const step = steps[index];
    if (step.kind === 'MESSAGE') {
      frames.push({ at: time, visible: index, typing: step.speakerId, latest: null, done: false });
      time += 1000;
    }
    frames.push({ at: time, visible: index + 1, typing: null, latest: step.id, done: false });
    time += step.kind === 'CHOICE' ? 400 : 200;
  }
  frames.push({ at: time, visible: end, typing: null, latest: null, done: true });
  return frames;
}
