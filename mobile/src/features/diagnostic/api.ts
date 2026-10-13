import { apiRequest } from '../../services/api/client';
import type { DiagnosticApi } from './types';

// A timed-out mutation is uncertain: the flow retains its original key and payload.
async function request<T>(path: string, body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    return await apiRequest<T>(path, { signal: controller.signal,
      ...(body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) }) });
  } finally { clearTimeout(timeout); }
}
export const diagnosticApi: DiagnosticApi = {
  metadata: () => request('/diagnostic'),
  start: requestKey => request('/diagnostic/attempts', { requestKey }),
  submit: (attemptId, questionId, requestKey, answer) => request(`/diagnostic/attempts/${attemptId}/questions/${questionId}/submit`, { requestKey, answer }),
  abandon: attemptId => request(`/diagnostic/attempts/${attemptId}/abandon`, {}),
  result: () => request('/diagnostic/result'),
};
