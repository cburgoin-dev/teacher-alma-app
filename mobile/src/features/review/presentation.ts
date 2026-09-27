import { ApiError } from '../../services/api/client';
import type { ReviewOutcome } from './types';
export function reviewError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === 'REVIEW_BATCH_INVALID') return 'Este repaso ya no está disponible. Tus respuestas confirmadas se conservaron.';
    if (error.code === 'REVIEW_ITEM_NOT_ACTIVE' || error.code === 'REVIEW_ITEM_NOT_FOUND') return 'Este ejercicio ya no está disponible. Puedes continuar con el siguiente.';
    if (error.code === 'INVALID_ANSWER') return 'Revisa tu respuesta antes de comprobarla.';
    if (error.status === 401) return 'No pudimos validar tu sesión. Vuelve a entrar cuando tu acceso esté disponible.';
  }
  return 'No pudimos confirmar la respuesta. Reenvíala para comprobar si quedó guardada; no se contará dos veces.';
}
export function reviewResult(outcomes: ReviewOutcome[]) {
  const answered = outcomes.filter(o => o.response !== null);
  const groups = new Map<string, { id: string; title: string; answered: number; resolved: number }>();
  for (const { item, response } of answered) {
    const topic = item.source.topic;
    const group = groups.get(topic.id) ?? { ...topic, answered: 0, resolved: 0 };
    group.answered++;
    if (response!.reviewItem.status === 'RESOLVED') group.resolved++;
    groups.set(topic.id, group);
  }
  const resolved = answered.filter(o => o.response!.reviewItem.status === 'RESOLVED').length;
  return { resolved, pending: answered.length - resolved, skipped: outcomes.length - answered.length, topics: [...groups.values()] };
}
