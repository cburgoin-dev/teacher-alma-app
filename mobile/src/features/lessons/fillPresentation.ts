/** The underscore run is the authored blank marker, never an inferred answer. */
export function fillParts(prompt: string): { before: string; after: string } | null {
  const markers = [...prompt.matchAll(/_{2,}/g)];
  if (markers.length !== 1) return null;
  const marker = markers[0];
  return { before: prompt.slice(0, marker.index), after: prompt.slice(marker.index! + marker[0].length) };
}

/** Public presentation limit; independent of private accepted answers. */
export const FILL_MAX_LENGTH = 40;
export function blankColor(answered: boolean, focused: boolean, correct: boolean | null): string {
  return correct === true ? '#13874C' : correct === false ? '#B34436' : answered || focused ? '#0062E9' : '#BACBE1';
}
/** Reveal the start of feedback with preceding answer context, only if below view. */
export function feedbackScrollTarget(y: number, height: number, top: number, feedbackHeight: number): number | null {
  if (height <= 0 || top + Math.min(feedbackHeight, 100) <= y + height) return null;
  return Math.max(y, top - Math.max(40, height * .45));
}
