export const stage = (value: number, start: number, end: number) => Math.max(0, Math.min(1, (value - start) / (end - start)));
export function completionDrawing(value: number) {
  return { ring: stage(value, 0, .7), check: stage(value, .45, .95), star: stage(value, .65, 1) };
}
export const revealStages = { lock: [0, .35], ring: [.15, .7], icon: [.35, .8], dot: [.6, .85], card: [.65, 1] } as const;
// The stationary RouteBus faces right. Only a leftward departure changes it.
export function changesFacing(previousLeft: boolean, nextLeft: boolean) { return previousLeft !== nextLeft; }
