import { ApiError } from '../../services/api/client';
import { homeApi } from './api';
import type { HomeResponse } from './types';
type State = { data: HomeResponse | null; loading: boolean; error: string | null };
/** Home only. The existing Gamification resource remains the sole owner of its aggregate. */
export class HomeResource {
  private state: State = { data: null, loading: false, error: null };
  private listeners = new Set<() => void>();
  private reading?: Promise<void>;
  constructor(private api = homeApi) {}
  snapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private set(patch: Partial<State>) { this.state = { ...this.state, ...patch }; this.listeners.forEach(listener => listener()); }
  refresh = (): Promise<void> => {
    if (this.reading) return this.reading;
    this.set({ loading: true, error: null });
    this.reading = Promise.resolve().then(async () => {
      try { this.set({ data: await this.api.read() }); }
      catch (error) { this.set({ error: error instanceof ApiError && error.status === 401
        ? 'No pudimos validar tu sesión. Inténtalo de nuevo.' : 'No pudimos actualizar Inicio. Revisa tu conexión e inténtalo de nuevo.' }); }
      finally { this.reading = undefined; this.set({ loading: false }); }
    });
    return this.reading;
  };
}
export const homeResource = new HomeResource();
