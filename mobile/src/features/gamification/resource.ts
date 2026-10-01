import { ApiError } from '../../services/api/client';
import { gamificationApi } from './api/gamification';
import { gamificationError } from './presentation';
import type { GamificationAggregate } from './types';
type Operation = { kind: 'purchase'; requestKey: string } | { kind: 'repair'; requestKey: string; repairId: string };
type State = {
  data: GamificationAggregate | null; loading: boolean; error: string | null;
  busy: boolean; pending: Operation | null; operationError: string | null; notice: string | null;
};
export function deviceTimezone() {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (typeof zone !== 'string' || !zone.trim() || /^[+-]|^(UTC|GMT)[+-]/i.test(zone)) return null;
    new Intl.DateTimeFormat('en', { timeZone: zone }).format();
    return zone;
  } catch { return null; }
}
const requestKey = () => `gamification_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
/** One app session; shared reads and pending spending survive Shop navigation. */
export class GamificationResource {
  private state: State = { data: null, loading: false, error: null, busy: false, pending: null, operationError: null, notice: null };
  private listeners = new Set<() => void>();
  private timezonePromise?: Promise<void>;
  private timezoneFailed = false;
  private reading?: Promise<void>;
  constructor(private api = gamificationApi, private resolveTimezone = deviceTimezone) {}
  snapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private set(patch: Partial<State>) { this.state = { ...this.state, ...patch }; this.listeners.forEach(listener => listener()); }
  ensureTimezone = (retry = false): Promise<void> => {
    if (retry && this.timezoneFailed) { this.timezonePromise = undefined; this.timezoneFailed = false; }
    if (!this.timezonePromise) {
      this.timezonePromise = Promise.resolve().then(async () => {
        const timezone = this.resolveTimezone();
        if (!timezone) throw new ApiError(400, 'INVALID_USER_TIMEZONE', 'Device timezone unavailable');
        await this.api.timezone(timezone);
      }).catch(error => { this.timezoneFailed = true; throw error; });
    }
    return this.timezonePromise;
  };
  refresh = (retryTimezone = false): Promise<void> => this.state.busy ? Promise.resolve() : this.read(retryTimezone);
  private read(retryTimezone = false): Promise<void> {
    if (this.reading) return this.reading;
    this.set({ loading: true, error: null });
    this.reading = Promise.resolve().then(async () => {
      try {
        await this.ensureTimezone(retryTimezone);
        this.set({ data: await this.api.read() });
      } catch (error) { this.set({ error: gamificationError(error) }); }
      finally { this.reading = undefined; this.set({ loading: false }); }
    });
    return this.reading;
  }
  purchase = () => {
    const { data, busy, loading, error, pending } = this.state;
    if (!data || busy || loading || error || pending || data.streak.protectorCount >= data.streak.protectorMax) return Promise.resolve();
    return this.execute({ kind: 'purchase', requestKey: requestKey() });
  };
  repair = () => {
    const { data, busy, loading, error, pending } = this.state;
    if (!data?.streak.repair || busy || loading || error || pending) return Promise.resolve();
    return this.execute({ kind: 'repair', requestKey: requestKey(), repairId: data.streak.repair.id });
  };
  retryOperation = () => this.state.pending ? this.execute(this.state.pending) : Promise.resolve();
  private async execute(operation: Operation) {
    if (this.state.busy || this.state.loading) return;
    this.set({ busy: true, pending: operation, operationError: null, notice: null });
    try {
      if (operation.kind === 'purchase') await this.api.purchase(operation.requestKey);
      else await this.api.repair(operation.requestKey, operation.repairId);
      this.set({ pending: null, notice: operation.kind === 'purchase' ? 'Protector comprado.' : 'Racha restaurada.' });
      // A failed refresh must never retry an already acknowledged debit.
      await this.read();
    } catch (error) {
      const definite = error instanceof ApiError && error.status >= 400 && error.status < 500 && ![408, 429].includes(error.status);
      this.set({ operationError: gamificationError(error), ...(definite ? { pending: null } : {}) });
      if (definite) await this.read();
    } finally { this.set({ busy: false }); }
  }
}
export const gamificationResource = new GamificationResource();

/** Learning can finish from several endpoints; wait for timezone before any of them. */
export async function withLearningTimezone<T>(action: () => Promise<T>): Promise<T> {
  try { await gamificationResource.ensureTimezone(true); }
  catch (error) { throw new Error(gamificationError(error)); }
  return action();
}
