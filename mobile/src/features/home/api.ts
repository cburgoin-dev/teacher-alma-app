import { apiRequest } from '../../services/api/client';
import type { HomeResponse } from './types';

/** Reject incompatible state/hero envelopes instead of silently inventing a Home state. */
export function parseHome(value: unknown): HomeResponse {
  const data = value as HomeResponse | null;
  if (!data || !['NEW', 'ASSESSED', 'ACTIVE', 'COURSE_COMPLETED'].includes(data.state)
    || data.hero?.type !== data.state || !data.learner || !(data.learner.displayName === null || typeof data.learner.displayName === 'string')
    || !Number.isInteger(data.review?.pendingCount) || data.review.pendingCount < 0 || !Array.isArray(data.featuredCourses)) {
    throw new Error('Invalid Home response');
  }
  return data;
}
export const homeApi = { read: async () => parseHome(await apiRequest<unknown>('/me/home')) };
