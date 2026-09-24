import { ApiError } from '../../services/api/client';
import type { Activity, LessonResult, Pair } from './types';
export const resultVariant = (result: LessonResult['result']) => result.isPerfect ? 'PERFECT' : result.pendingReviewCount > 0 ? 'REVIEW_PENDING' : 'NORMAL';
export function lessonError(error: unknown) {
  if (error instanceof ApiError) {
    const messages: Record<string, string> = {
      LESSON_ACCESS_REQUIRED: 'Esta lección requiere acceso al curso o Premium.',
      LESSON_PREREQUISITE_REQUIRED: 'Completa primero las lecciones anteriores de la ruta.',
      COURSE_NOT_STARTED: 'Comienza el curso desde su detalle antes de abrir esta lección.',
      LESSON_NOT_FOUND: 'Esta lección ya no está disponible.', LESSON_HAS_NO_CONTENT: 'Esta lección todavía no tiene contenido disponible.',
      STEP_NOT_AVAILABLE: 'Hay un paso anterior pendiente. Vuelve a la ruta y reanuda la lección.',
      LESSON_REQUIREMENTS_INCOMPLETE: 'Quedan pasos pendientes. Vuelve a la ruta para continuar.',
      INVALID_ANSWER: 'Revisa tu respuesta antes de enviarla.',
    };
    return messages[error.code] ?? 'No pudimos completar esta acción. Inténtalo nuevamente.';
  }
  return 'No pudimos confirmar la respuesta del servidor. Comprueba tu conexión. Si enviaste una respuesta, puede haberse guardado; vuelve a la ruta para reanudar.';
}
export function pairSelection(pairs: Pair[], wordId: string, imageId: string): Pair[] {
  return [...pairs.filter(p => p.wordId !== wordId && p.imageId !== imageId), { wordId, imageId }];
}
// This formats server feedback only. No answer key is present before submission.
export function expectedAnswer(activity: Activity, answer: unknown): string {
  if (typeof answer === 'string') {
    if ('options' in activity) return activity.options.find(o => o.id === answer)?.text ?? answer;
    return answer;
  }
  if (activity.type === 'MATCH_WORD_IMAGE' && Array.isArray(answer)) return answer.map((p: unknown) => {
    if (!p || typeof p !== 'object' || !('wordId' in p) || !('imageId' in p)) return '';
    return `${activity.words.find(w => w.id === p.wordId)?.text ?? ''} → ${activity.images.find(i => i.id === p.imageId)?.alt ?? ''}`;
  }).filter(Boolean).join('\n');
  return '';
}
