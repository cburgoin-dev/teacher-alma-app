export const stage = (value: number, start: number, end: number) => Math.max(0, Math.min(1, (value - start) / (end - start)));
export function completionDrawing(value: number) {
  return { ring: stage(value, .03, .65), check: stage(value, .45, .9), star: stage(value, .7, .95) };
}
export const revealStages = { lock: [0, .25], ring: [.17, .6], icon: [.43, .73], dot: [.68, .85], card: [.76, 1] } as const;
// The stationary RouteBus faces right. Only a leftward departure changes it.
export function changesFacing(previousLeft: boolean, nextLeft: boolean) { return previousLeft !== nextLeft; }
