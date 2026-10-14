import { coursesApi } from '../courses/api/courses';

/** Optional display enrichment. Never replaces the result's course/access/routing truth. */
export function loadCourseMetadata(courseId: string, publish: (label: string) => void, api = coursesApi) {
  const controller = new AbortController();
  void api.detail(courseId, controller.signal).then(course => {
    if (controller.signal.aborted || course.id !== courseId) return;
    const { lessonCount, topicCount } = course.content;
    if (![lessonCount, topicCount].every(n => Number.isInteger(n) && n >= 0)) return;
    publish(`${lessonCount} ${lessonCount === 1 ? 'lección' : 'lecciones'} · ${topicCount} ${topicCount === 1 ? 'tema' : 'temas'}`);
  }).catch(() => { /* Keep the existing CourseCard fallback on secondary request failure. */ });
  return () => controller.abort();
}
