import type { Activity, Answer } from '../lessons/types';
import type { Course } from '../courses/types';

export type DiagnosticMetadata = { available: boolean; diagnostic: null | {
  id: string; title: string; version: number; questionCount: number; estimatedMinutes: number | null;
} };
export type DiagnosticQuestion = { id: string; position: number; totalQuestions: number; activity: Activity };
export type DiagnosticResult = {
  attemptId: string; completedAt: string; recommendedLevel: string;
  recommendedCourse: Omit<Course, 'slug'> | null;
  strengths: null; reinforcementAreas: null;
};
export type ActiveReceipt = {
  attempt: { id: string; status: 'ACTIVE'; answeredQuestions: number; totalQuestions: number };
  question: DiagnosticQuestion;
};
export type DiagnosticReceipt = ActiveReceipt | {
  attempt: { id: string; status: 'COMPLETED'; answeredQuestions: number; totalQuestions: number; completedAt: string };
  result: DiagnosticResult;
};
export interface DiagnosticApi {
  metadata(): Promise<DiagnosticMetadata>;
  start(requestKey: string): Promise<ActiveReceipt>;
  submit(attemptId: string, questionId: string, requestKey: string, answer: Answer): Promise<DiagnosticReceipt>;
  abandon(attemptId: string): Promise<unknown>;
  result(): Promise<{ result: DiagnosticResult }>;
}
