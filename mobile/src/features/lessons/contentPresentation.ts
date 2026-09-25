import type { Activity, Block, Segment } from './types';

export function courseLabel(course?: { title: string; level: string | null }) {
  return course?.title.trim() || (course?.level ? `Inglés ${course.level}` : undefined);
}
export function accuracy(correct: number, total: number) {
  return total > 0 ? Math.round(correct / total * 100) : 0;
}

export function textRuns(fallback?: string, segments?: Segment[]): Segment[] {
  return segments?.length ? segments : fallback ? [{ text: fallback }] : [];
}
export function summaryTakeaways(block: Extract<Block, { type: 'SUMMARY' }>): { text: string; segments?: Segment[] }[] {
  return block.takeaways?.length ? block.takeaways : (block.points ?? []).map(text => ({ text }));
}
// Structured MC context replaces the v1 situational prompt. No parsing of names or phrases.
export function activityPresentation(activity: Activity) {
  const fill = activity.type === 'FILL_BLANK_OPTIONS' || activity.type === 'FILL_BLANK_TEXT';
  const matching = activity.type === 'MATCH_WORD_IMAGE';
  return {
    title: fill ? 'Completa la oración' : matching ? 'Relaciona las palabras' : '¿Qué responderías?',
    instruction: activity.instruction ?? (fill ? activity.type === 'FILL_BLANK_TEXT' ? 'Escribe la palabra que falta.' : 'Elige la palabra que falta.' : matching ? 'Toca una palabra y su imagen, en el orden que prefieras.' : 'Elige la mejor respuesta.'),
    showPrompt: activity.type !== 'MULTIPLE_CHOICE' || activity.context?.type !== 'DIALOGUE',
  };
}
export function mediaUrl(value?: string) {
  if (!value) return undefined;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? value : undefined; }
  catch { return undefined; }
}
