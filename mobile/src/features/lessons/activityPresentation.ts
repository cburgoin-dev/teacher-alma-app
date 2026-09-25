import type { ActivityFeedback, Pair } from './types';
export function pairFeedback(pair: Pair | undefined, feedback: ActivityFeedback | null) {
  if (!pair || !feedback || !Array.isArray(feedback.feedback.correctAnswer)) return null;
  const expected = feedback.feedback.correctAnswer.find((p: unknown): p is Pair => !!p && typeof p === 'object' && 'wordId' in p && p.wordId === pair.wordId && 'imageId' in p && typeof p.imageId === 'string');
  return expected ? expected.imageId === pair.imageId : null;
}
export const feedbackCorrect = (feedback: ActivityFeedback) => 'attempt' in feedback ? feedback.attempt.isCorrect : feedback.isCorrect;
export const reinforcementOnCompletion = (feedback: ActivityFeedback) => 'reinforcement' in feedback && feedback.reinforcement.onCompletion;
export function feedbackTitle(feedback: ActivityFeedback) {
  const retried = 'attempt' in feedback ? feedback.attempt.attemptNumber > 1 && feedback.reinforcement.onCompletion : feedback.submissionNumber > 1;
  return !feedbackCorrect(feedback) ? 'Vamos a repasarlo' : retried ? '¡Ahora sí!' : '¡Correcto!';
}
// Both SVG anchors and paths use the same measured card-edge coordinates.
export function connectionPath(x1: number, y1: number, x2: number, y2: number) {
  const middle = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${middle} ${y1}, ${middle} ${y2}, ${x2} ${y2}`;
}
