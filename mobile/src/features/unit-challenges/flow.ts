import { challengeApi } from './api';
import { ApiError } from '../../services/api/client';
import type { Answer, Metadata, RunResponse } from './types';
type State = { metadata?: Metadata; response?: RunResponse; busy: boolean; error?: string; pending: boolean; exited: boolean };
const key = () => `challenge_${Date.now()}_${Math.random().toString(36).slice(2)}`;
export class ChallengeFlow {
  private state: State = { busy: false, pending: false, exited: false };
  private listeners = new Set<() => void>();
  private retryAction?: () => Promise<void>;
  private alive = true;
  constructor(private id: string, private api = challengeApi) {}
  snapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  dispose = () => { this.alive = false; this.listeners.clear(); };
  private set(patch: Partial<State>) { if (this.alive) { this.state = { ...this.state, ...patch }; this.listeners.forEach(l => l()); } }
  private async execute(action: () => Promise<void>) {
    if (!this.alive || this.state.busy || this.state.exited) return;
    this.retryAction = action;
    this.set({ busy: true, error: undefined });
    try { await action(); this.retryAction = undefined; this.set({ pending: false }); }
    catch (e) {
      // A definite client rejection did not commit this operation; transport/server
      // failures remain frozen because the write may already have committed.
      const rejected = e instanceof ApiError && e.status >= 400 && e.status < 500 && ![408, 429].includes(e.status);
      this.set({ error: e instanceof Error ? e.message : 'No pudimos conectar. Inténtalo de nuevo.', ...(rejected ? { pending: false } : {}) });
    }
    finally { this.set({ busy: false }); }
  }
  retry = () => this.retryAction ? this.execute(this.retryAction) : this.load();
  load = () => this.execute(async () => {
    const metadata = await this.api.metadata(this.id);
    this.set({ metadata });
    if (metadata.activeRun) this.set({ response: await this.api.run(this.id, metadata.activeRun.id) });
  });
  start = () => {
    if (this.state.busy || this.state.pending) return;
    const requestKey = key();
    this.set({ pending: true });
    return this.execute(async () => { this.set({ response: await this.api.start(this.id, requestKey) }); });
  };
  submit = (answer: Answer) => {
    const response = this.state.response;
    if (!response?.phase || this.state.busy || this.state.pending) return;
    const phaseId = response.phase.id, runId = response.run.id, requestKey = key();
    // Freeze both key and payload until the server acknowledges this submission.
    const frozen = JSON.parse(JSON.stringify(answer)) as Answer;
    this.set({ pending: true });
    return this.execute(async () => {
      try { this.set({ response: await this.api.submit(this.id, runId, phaseId, requestKey, frozen) }); }
      catch (error) {
        if (!(error instanceof ApiError) || error.status !== 409) throw error;
        // Another client may have finished/abandoned this run. Read authoritative
        // state instead of attempting to write into a different phase.
        this.set({ response: await this.api.run(this.id, runId) });
      }
    });
  };
  abandon = () => {
    if (this.state.busy || this.state.pending) return;
    this.set({ pending: true });
    return this.execute(async () => {
      const runId = this.state.response?.run.status === 'ACTIVE' ? this.state.response.run.id : !this.state.response ? this.state.metadata?.activeRun?.id : undefined;
      if (runId) await this.api.abandon(this.id, runId);
      this.set({ exited: true });
    });
  };
}
