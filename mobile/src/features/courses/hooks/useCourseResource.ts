import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

// Reload on focus so starting a course is reflected when returning to the catalog.
export function useCourseResource<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    const current = ++generation.current;
    setLoading(true); setError(null);
    load(controller.signal).then(result => {
      if (!controller.signal.aborted && current === generation.current) setData(result);
    }).catch(reason => {
      if (!controller.signal.aborted && current === generation.current) setError(reason);
    }).finally(() => {
      if (!controller.signal.aborted && current === generation.current) setLoading(false);
    });
    return () => controller.abort();
  }, [load, revision]));
  return { data, loading, error, retry: () => setRevision(value => value + 1) };
}
