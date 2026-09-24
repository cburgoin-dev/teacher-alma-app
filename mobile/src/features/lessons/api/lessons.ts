import { apiRequest } from '../../../services/api/client';
import type { Answer, AttemptResponse, LessonData, LessonResult, StartResponse, StepResponse } from '../types';
const path = (id: string) => `/lessons/${encodeURIComponent(id)}`;
export const lessonsApi = {
  read: (id: string, signal?: AbortSignal) => apiRequest<LessonData>(path(id), { signal }),
  start: (id: string) => apiRequest<StartResponse>(`${path(id)}/start`, { method: 'POST' }),
  completeStep: (id: string, step: string) => apiRequest<StepResponse>(`${path(id)}/steps/${encodeURIComponent(step)}/complete`, { method: 'POST' }),
  attempt: (id: string, step: string, answer: Answer) => apiRequest<AttemptResponse>(`${path(id)}/steps/${encodeURIComponent(step)}/attempt`, { method: 'POST', body: JSON.stringify(answer) }),
  complete: (id: string) => apiRequest<LessonResult>(`${path(id)}/complete`, { method: 'POST' }),
};
