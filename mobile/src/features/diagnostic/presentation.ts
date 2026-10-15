import { ApiError } from '../../services/api/client';
import { catalogDestination } from '../courses/presentation';
import type { DiagnosticQuestion, DiagnosticResult } from './types';

export function questionProgress(question: DiagnosticQuestion): number {
  return Math.max(0, Math.min(100, question.position / question.totalQuestions * 100));
}
export function resultCourseAction(result: DiagnosticResult) {
  const course = result.recommendedCourse;
  if (!course) return null;
  const screen = catalogDestination(course);
  return { screen, params: { courseId: course.id }, title: screen === 'CourseDetail' ? 'Ver curso recomendado'
    : course.progress?.status === 'COMPLETED' ? 'Repasar curso' : 'Continuar curso' };
}
export function diagnosticError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'DIAGNOSTIC_UNAVAILABLE') return 'El diagnóstico no está disponible por ahora. Puedes explorar los cursos.';
    if (error.code === 'DIAGNOSTIC_RESULT_NOT_FOUND') return 'Todavía no hay un resultado disponible.';
    if (error.code === 'INVALID_ANSWER') return 'Revisa tu respuesta e inténtalo de nuevo.';
    if (error.status === 409 || error.status === 404) return 'Este intento ya no puede continuar. Puedes comenzar un nuevo diagnóstico.';
  }
  return 'No pudimos confirmar la operación. Comprueba tu conexión y vuelve a intentarlo.';
}
