import { apiRequest } from '../../../services/api/client';
import { withLearningTimezone } from '../../gamification/resource';
import type { Answer, AttemptResponse, LessonData, LessonResult, ReplayCheckResponse, StartResponse, StepResponse } from '../types';
const path = (id: string) => `/lessons/${encodeURIComponent(id)}`;
export const lessonsApi = {
  read: (id: string, signal?: AbortSignal) => apiRequest<LessonData>(path(id), { signal }),
  start: (id: string, requestKey: string) => withLearningTimezone(() => apiRequest<StartResponse>(`${path(id)}/runs`, { method: 'POST', body: JSON.stringify({ requestKey }) })),
  completeStep: (id: string, runId: string, step: string) => withLearningTimezone(() => apiRequest<StepResponse>(`${path(id)}/runs/${encodeURIComponent(runId)}/steps/${encodeURIComponent(step)}/complete`, { method: 'POST' })),
  attempt: (id: string, runId: string, step: string, answer: Answer) => withLearningTimezone(() => apiRequest<AttemptResponse>(`${path(id)}/runs/${encodeURIComponent(runId)}/steps/${encodeURIComponent(step)}/attempt`, { method: 'POST', body: JSON.stringify(answer) })),
  complete: (id: string, runId: string) => withLearningTimezone(() => apiRequest<LessonResult>(`${path(id)}/runs/${encodeURIComponent(runId)}/complete`, { method: 'POST' })),
  abandon: (id: string, runId: string) => apiRequest<{ runId: string; status: 'ABANDONED' }>(`${path(id)}/runs/${encodeURIComponent(runId)}/abandon`, { method: 'POST' }),
  replayCheck: (id: string, step: string, answer: Answer) => apiRequest<ReplayCheckResponse>(`${path(id)}/replay/steps/${encodeURIComponent(step)}/check`, { method: 'POST', body: JSON.stringify(answer) }),
};
