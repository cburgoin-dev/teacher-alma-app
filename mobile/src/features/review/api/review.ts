import { apiRequest } from '../../../services/api/client';
import type { ReviewSummary, ReviewBatch, ReviewSubmission, ReviewAttempt } from '../types';
export const reviewApi = {
  read: (signal?: AbortSignal) => apiRequest<ReviewSummary>('/review', { signal }),
  batch: (preferredLessonId?: string) => apiRequest<ReviewBatch>('/review/batches', {
    method: 'POST', body: JSON.stringify({ preferredLessonId: preferredLessonId ?? null }),
  }),
  attempt: (id: string, submission: ReviewSubmission) => apiRequest<ReviewAttempt>('/review/items/' + encodeURIComponent(id) + '/attempt', {
    method: 'POST', body: JSON.stringify(submission),
  }),
};
