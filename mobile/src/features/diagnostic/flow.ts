import { ApiError } from '../../services/api/client';
import type { Answer } from '../lessons/types';
import { diagnosticApi } from './api';
import type { ActiveReceipt, DiagnosticApi, DiagnosticMetadata, DiagnosticReceipt, DiagnosticResult } from './types';

type PendingSubmission = { questionId: string; requestKey: string; answer: Answer };
export type DiagnosticState = {
  phase: 'intro' | 'questions' | 'result' | 'terminal';
  metadata: DiagnosticMetadata | null; active: ActiveReceipt | null; result: DiagnosticResult | null;
  busy: boolean; error: unknown; startKey: string | null; pending: PendingSubmission | null;
  exitRequested: boolean; exited: boolean;
};
const requestKey = () => `diagnostic_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
export class DiagnosticFlow {
  private state: DiagnosticState;
  private listeners = new Set<() => void>();
  private disposed = false;
  constructor(view: 'intro' | 'result' = 'intro', private api: DiagnosticApi = diagnosticApi, private key = requestKey) {
    this.state = { phase: view, metadata: null, active: null, result: null, busy: false, error: null,
      startKey: null, pending: null, exitRequested: false, exited: false };
  }
  snapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  dispose = () => { this.disposed = true; this.listeners.clear(); };
  private set(patch: Partial<DiagnosticState>) {
    if (this.disposed) return;
    this.state = { ...this.state, ...patch }; this.listeners.forEach(listener => listener());
  }
  private async run(work: () => Promise<void>) {
    if (this.state.busy || this.disposed) return;
    this.set({ busy: true, error: null });
    try { await work(); } catch (error) { this.set({ error }); }
    finally { this.set({ busy: false }); }
  }
  load = () => this.run(async () => {
    if (this.state.phase === 'result') this.set({ result: (await this.api.result()).result });
    else this.set({ metadata: await this.api.metadata() });
  });
  start = () => this.run(async () => {
    if (this.state.phase !== 'intro' || !this.state.metadata?.available) return;
    const key = this.state.startKey ?? this.key();
    this.set({ startKey: key });
    try { this.accept(await this.api.start(key)); }
    catch (error) {
      if (error instanceof ApiError && error.code === 'DIAGNOSTIC_UNAVAILABLE') this.set({ metadata: { available: false, diagnostic: null }, startKey: null });
      else if (error instanceof ApiError && error.status === 409) this.set({ phase: 'terminal', startKey: null });
      throw error;
    }
  });
  private accept(receipt: DiagnosticReceipt) {
    if ('result' in receipt) this.set({ phase: 'result', result: receipt.result, active: null, pending: null, startKey: null });
    else this.set({ phase: 'questions', active: receipt, pending: null, startKey: null });
  }
  submit = (answer: Answer) => this.run(async () => {
    const active = this.state.active;
    if (this.state.phase !== 'questions' || !active) return;
    const pending = this.state.pending ?? { questionId: active.question.id, requestKey: this.key(), answer: JSON.parse(JSON.stringify(answer)) as Answer };
    this.set({ pending });
    try { this.accept(await this.api.submit(active.attempt.id, pending.questionId, pending.requestKey, pending.answer)); }
    catch (error) {
      if (error instanceof ApiError && error.code === 'INVALID_ANSWER') this.set({ pending: null });
      else if (error instanceof ApiError && (error.status === 409 || error.status === 404)) {
        const ended = error.code === 'DIAGNOSTIC_ATTEMPT_NOT_ACTIVE' || error.code === 'DIAGNOSTIC_ATTEMPT_NOT_FOUND';
        this.set({ phase: 'terminal', active: ended ? null : active, pending: null });
      }
      throw error;
    }
  });
  back = (): boolean => {
    if (this.state.busy) return true;
    if (!this.state.exited && (this.state.active || this.state.startKey)) { this.set({ exitRequested: true }); return true; }
    return false;
  };
  cancelExit = () => this.set({ exitRequested: false });
  confirmExit = () => this.run(async () => {
    this.set({ exitRequested: false });
    let active = this.state.active;
    // Recover only this still-mounted start intention when its response was lost.
    if (!active && this.state.startKey) {
      try { active = await this.api.start(this.state.startKey); }
      catch (error) {
        if (error instanceof ApiError && (error.code === 'DIAGNOSTIC_START_REQUEST_CONFLICT' || error.code === 'DIAGNOSTIC_UNAVAILABLE')) {
          this.set({ phase: 'terminal', startKey: null });
        }
        throw error;
      }
      this.set({ active, phase: 'questions', startKey: null });
    }
    if (active) {
      try { await this.api.abandon(active.attempt.id); }
      catch (error) {
        // A final receipt may have been lost. Never pretend that completion was abandoned.
        if (error instanceof ApiError && error.status === 409) {
          const { result } = await this.api.result();
          if (result.attemptId === active.attempt.id) { this.set({ phase: 'result', result, active: null, pending: null }); return; }
        }
        throw error;
      }
    }
    this.set({ exited: true, active: null, startKey: null, pending: null });
  });
  retake = () => {
    if (this.state.busy || this.state.active || this.state.startKey) return Promise.resolve();
    this.set({ phase: 'intro', result: null, metadata: null, pending: null, error: null });
    return this.load();
  };
}
