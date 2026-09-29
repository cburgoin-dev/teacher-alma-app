import { apiRequest } from '../../services/api/client';
import type { Answer, Metadata, RunResponse } from './types';
const base = (id: string) => `/unit-challenges/${encodeURIComponent(id)}`;
const post = (body: unknown) => ({ method: 'POST', body: JSON.stringify(body) });
export const challengeApi = {
  metadata: (id: string) => apiRequest<Metadata>(base(id)),
  start: (id: string, requestKey: string) => apiRequest<RunResponse>(`${base(id)}/runs`, post({ requestKey })),
  run: (id: string, runId: string) => apiRequest<RunResponse>(`${base(id)}/runs/${encodeURIComponent(runId)}`),
  submit: (id: string, runId: string, phaseId: string, requestKey: string, answer: Answer) => apiRequest<RunResponse>(`${base(id)}/runs/${encodeURIComponent(runId)}/phases/${encodeURIComponent(phaseId)}/submit`, post({ requestKey, answer })),
  abandon: (id: string, runId: string) => apiRequest<unknown>(`${base(id)}/runs/${encodeURIComponent(runId)}/abandon`, post({})),
};
