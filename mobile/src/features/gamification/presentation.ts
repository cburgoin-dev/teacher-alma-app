import { ApiError } from '../../services/api/client';
import type { DailyGoalPreset } from './types';
export const presetLabel: Record<DailyGoalPreset, string> = { CASUAL: 'Casual', NORMAL: 'Normal', INTENSE: 'Intensa' };
const rewardLabels: Record<string, string> = {
  LESSON_FIRST_COMPLETION: 'Primera lección completada', LESSON_FIRST_PERFECT: 'Primer resultado perfecto',
  UNIT_CHALLENGE_FIRST_PASS: 'Primer reto aprobado', UNIT_CHALLENGE_FIRST_PERFECT: 'Primer reto perfecto',
  COURSE_COMPLETION: 'Curso completado', DAILY_GOAL: 'Meta diaria', STREAK_MILESTONE: 'Hito de racha',
};
export const rewardLabel = (reason: string) => rewardLabels[reason] ?? 'Recompensa';
const errors: Record<string, string> = {
  INSUFFICIENT_COINS: 'Todavía no tienes suficientes monedas.',
  PROTECTOR_STOCK_FULL: 'Ya tienes el máximo de protectores.',
  ITEM_UNAVAILABLE: 'El protector no está disponible en este momento.',
  STREAK_REPAIR_EXPIRED: 'El plazo para restaurar esta racha terminó.',
  STREAK_REPAIR_NOT_ELIGIBLE: 'Esta racha ya no está disponible para restaurar.',
  STREAK_REPAIR_COOLDOWN: 'Aún no puedes volver a restaurar una racha.',
  ALREADY_REPAIRED: 'Esta racha ya fue restaurada.',
  IDEMPOTENCY_CONFLICT: 'No pudimos confirmar esta solicitud. Actualiza el estado antes de intentarlo de nuevo.',
  INVALID_USER_TIMEZONE: 'No pudimos sincronizar la zona horaria del dispositivo. Revisa sus ajustes e inténtalo de nuevo.',
};
export function gamificationError(error: unknown) {
  if (error instanceof ApiError) return errors[error.code] ?? (error.status === 401 ? 'Tu sesión no está disponible. Vuelve a iniciar sesión.' : 'No pudimos actualizar tu progreso. Inténtalo de nuevo.');
  return 'No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.';
}
export function repairDeadline(expiresAt: string) {
  return new Date(expiresAt).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
}
