import { ApiError } from '../../services/api/client';
import { progressApi } from './api';
import type { CalendarResponse, ProgressResponse } from './types';
export type ReadState<T> = { data: T | null; loading: boolean; error: string | null };
export const progressError = (error: unknown) => error instanceof ApiError && error.status === 401
  ? 'No pudimos validar tu sesión. Inténtalo de nuevo.' : 'No pudimos actualizar tu progreso. Revisa tu conexión e inténtalo de nuevo.';
/** Coalesced reads retain the last successful snapshot during refresh/failure. */
export class ProgressResource<T> {
  private state: ReadState<T> = { data: null, loading: false, error: null };
  private listeners = new Set<() => void>();
  private reading?: Promise<void>;
  constructor(private read: () => Promise<T>) {}
  snapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private set(patch: Partial<ReadState<T>>) { this.state = { ...this.state, ...patch }; this.listeners.forEach(fn => fn()); }
  refresh = (): Promise<void> => {
    if (this.reading) return this.reading;
    this.set({ loading: true, error: null });
    this.reading = Promise.resolve().then(async () => {
      try { this.set({ data: await this.read() }); } catch (error) { this.set({ error: progressError(error) }); }
      finally { this.reading = undefined; this.set({ loading: false }); }
    });
    return this.reading;
  };
}
export const progressResource = new ProgressResource<ProgressResponse>(progressApi.read);
/** Screen-local month cache: each key has independent requests, so late responses cannot replace another month. */
export class CalendarResources {
  private months = new Map<string, ProgressResource<CalendarResponse>>();
  constructor(private api = progressApi) {}
  month(key: string) {
    let resource = this.months.get(key);
    if (!resource) { resource = new ProgressResource(() => this.api.calendar(key)); this.months.set(key, resource); }
    return resource;
  }
}
