import { ApiError } from '../../services/api/client';
import type { Answer } from '../lessons/types';
import { reviewApi } from './api/review';
import type { ReviewSummary, ReviewBatch, ReviewAttempt, ReviewSubmission, ReviewOutcome } from './types';

type State = {
  phase: 'READY' | 'IN_PROGRESS' | 'RESULT'; summary: ReviewSummary | null; batch: ReviewBatch | null;
  index: number; feedback: ReviewAttempt | null; outcomes: ReviewOutcome[];
  busy: boolean; loading: boolean; error: unknown; pending: ReviewSubmission | null;
  unavailable: boolean; expired: boolean; exitRequested: boolean; exited: boolean;
};
const requestKey = () => 'review_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2) + '_' + Math.random().toString(36).slice(2);
/** One mounted batch. No activity checking or persisted resume on the client. */
export class ReviewFlow {
  private state: State = { phase: 'READY', summary: null, batch: null, index: 0, feedback: null, outcomes: [],
    busy: false, loading: true, error: null, pending: null, unavailable: false, expired: false, exitRequested: false, exited: false };
  private listeners = new Set<() => void>();
  private controller = new AbortController();
  private disposed = false;
  constructor(private preferredLessonId?: string, private api = reviewApi) {}
  snapshot = () => this.state;
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  private set(update: Partial<State>) {
    if (this.disposed || this.state.exited) return;
    this.state = { ...this.state, ...update }; this.listeners.forEach(fn => fn());
  }
  dispose = () => { this.disposed = true; this.controller.abort(); };
  load = async () => {
    if (this.state.busy || this.state.phase !== 'READY' || this.disposed || this.state.exited) return;
    this.set({ busy: true, loading: true, error: null });
    try { this.set({ summary: await this.api.read(this.controller.signal) }); }
    catch (error) { this.set({ error }); }
    finally { this.set({ busy: false, loading: false }); }
  };
  start = async () => {
    if (this.state.busy || this.state.phase !== 'READY' || !this.state.summary?.pendingCount || this.disposed || this.state.exited) return;
    this.set({ busy: true, error: null });
    try {
      const batch = await this.api.batch(this.preferredLessonId);
      if (!batch.items.length) this.set({ summary: { state: 'EMPTY', pendingCount: 0, groups: [] } });
      else if (!batch.batchToken) throw new Error('Missing batch authorization');
      else this.set({ batch, phase: 'IN_PROGRESS' });
    } catch (error) { this.set({ error }); }
    finally { this.set({ busy: false }); }
  };
  submit = async (answer: Answer) => {
    if (this.state.busy || this.state.exited || this.disposed || this.state.phase !== 'IN_PROGRESS'
      || this.state.feedback || this.state.unavailable || this.state.expired) return;
    const item = this.state.batch!.items[this.state.index];
    // Clone once: every transport retry reuses the exact key AND answer.
    const submission = this.state.pending ?? { batchToken: this.state.batch!.batchToken!, requestKey: requestKey(),
      answer: JSON.parse(JSON.stringify(answer)) as Answer };
    this.set({ busy: true, pending: submission, error: null });
    try {
      const feedback = await this.api.attempt(item.id, submission);
      this.set({ feedback, outcomes: [...this.state.outcomes, { item, response: feedback }] });
    } catch (error) {
      if (error instanceof ApiError && ['REVIEW_ITEM_NOT_ACTIVE', 'REVIEW_ITEM_NOT_FOUND'].includes(error.code)) {
        this.set({ error, unavailable: true, outcomes: [...this.state.outcomes, { item, response: null }] });
      } else if (error instanceof ApiError && (['REVIEW_BATCH_INVALID', 'INVALID_REVIEW_REQUEST_KEY'].includes(error.code) || error.status === 401)) {
        this.set({ error, expired: true });
      } else this.set({ error, ...(error instanceof ApiError && error.code === 'INVALID_ANSWER' ? { pending: null } : {}) });
    } finally { this.set({ busy: false }); }
  };
  continue = () => {
    if (this.state.busy || this.state.phase !== 'IN_PROGRESS' || (!this.state.feedback && !this.state.unavailable)) return;
    const index = this.state.index + 1;
    this.set({ index, phase: index === this.state.batch!.items.length ? 'RESULT' : 'IN_PROGRESS',
      feedback: null, pending: null, unavailable: false, error: null });
  };
  finishExpired = () => { if (this.state.expired && !this.state.busy) this.set({ phase: 'RESULT', error: null }); };
  requestExit = () => {
    if (this.state.phase === 'IN_PROGRESS') this.set({ exitRequested: true });
    else this.set({ exited: true });
  };
  cancelExit = () => this.set({ exitRequested: false });
  confirmExit = () => this.set({ exited: true, exitRequested: false });
}
