import type { AttemptResponse, Pair } from './types';
export function pairFeedback(pair: Pair | undefined, feedback: AttemptResponse | null) {
  if (!pair || !feedback || !Array.isArray(feedback.feedback.correctAnswer)) return null;
  const expected = feedback.feedback.correctAnswer.find((p: unknown): p is Pair => !!p && typeof p === 'object' && 'wordId' in p && p.wordId === pair.wordId && 'imageId' in p && typeof p.imageId === 'string');
  return expected ? expected.imageId === pair.imageId : null;
}
export function feedbackTitle(feedback: AttemptResponse) {
  return !feedback.attempt.isCorrect ? 'Vamos a repasarlo' : feedback.attempt.attemptNumber > 1 && feedback.review.pending ? '¡Ahora sí!' : '¡Correcto!';
}
// Native rounded segments approximate a cubic curve; no SVG dependency or gesture layer.
export function connectionSegments(x1: number, y1: number, x2: number, y2: number) {
  const point = (t: number) => ({ x: (1-t)**3*x1 + 3*(1-t)**2*t*(x1+(x2-x1)*.5) + 3*(1-t)*t*t*(x2-(x2-x1)*.5) + t**3*x2,
    y: (1-t)**3*y1 + 3*(1-t)**2*t*y1 + 3*(1-t)*t*t*y2 + t**3*y2 });
  return Array.from({ length: 32 }, (_, i) => {
    const a = point(i / 32), b = point((i + 1) / 32);
    return { x: (a.x+b.x)/2, y: (a.y+b.y)/2, length: Math.hypot(b.x-a.x,b.y-a.y)+1, angle: Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI };
  });
}
