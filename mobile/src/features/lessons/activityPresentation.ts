import type { AttemptResponse, Pair } from './types';
export function pairFeedback(pair: Pair | undefined, feedback: AttemptResponse | null) {
  if (!pair || !feedback || !Array.isArray(feedback.feedback.correctAnswer)) return null;
  const expected = feedback.feedback.correctAnswer.find((p: unknown): p is Pair => !!p && typeof p === 'object' && 'wordId' in p && p.wordId === pair.wordId && 'imageId' in p && typeof p.imageId === 'string');
  return expected ? expected.imageId === pair.imageId : null;
}
export function feedbackTitle(feedback: AttemptResponse) {
  return !feedback.attempt.isCorrect ? 'Vamos a repasarlo' : feedback.attempt.attemptNumber > 1 && feedback.review.pending ? '¡Ahora sí!' : '¡Correcto!';
}
// Both SVG anchors and paths use the same measured card-edge coordinates.
export function connectionPath(x1: number, y1: number, x2: number, y2: number) {
  const middle = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${middle} ${y1}, ${middle} ${y2}, ${x2} ${y2}`;
}
