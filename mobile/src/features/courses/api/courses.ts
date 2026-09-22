import { apiRequest } from '../../../services/api/client';
import type { CatalogCourse, CourseDetail, Roadmap, StartResponse } from '../types';

const path = (id: string) => `/courses/${encodeURIComponent(id)}`;
export const coursesApi = {
  catalog: (signal?: AbortSignal) => apiRequest<{ courses: CatalogCourse[] }>('/courses', { signal }),
  detail: (id: string, signal?: AbortSignal) => apiRequest<CourseDetail>(path(id), { signal }),
  roadmap: (id: string, signal?: AbortSignal) => apiRequest<Roadmap>(`${path(id)}/roadmap`, { signal }),
  start: (id: string, signal?: AbortSignal) => apiRequest<StartResponse>(`${path(id)}/start`, { method: 'POST', signal }),
};
