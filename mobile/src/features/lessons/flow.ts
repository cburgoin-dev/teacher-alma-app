import { lessonsApi } from './api/lessons';
import type { Answer, AttemptResponse, LessonData, LessonResult, StepProgress } from './types';

type State = { data: LessonData | null; stepId: string | null; progress: StepProgress | null;
  feedback: AttemptResponse | null; answer: Answer | null; result: LessonResult | null; busy: boolean; loading: boolean; error: unknown; review: boolean };
// One instance per mounted lesson; server owns progression. Local history only supports back navigation.
export class LessonFlow {
  private state: State = { data: null, stepId: null, progress: null, feedback: null, answer: null, result: null, busy: false, loading: true, error: null, review: false };
  private listeners = new Set<() => void>();
  private disposed = false;
  private controller = new AbortController();
  private frontier: string | null = null;
  private feedbackByStep = new Map<string, AttemptResponse>();
  private answersByStep = new Map<string, Answer>();
  private browsingPrevious = false;
  constructor(private id: string, private api = lessonsApi) {}
  snapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private set(update: Partial<State>) { if (!this.disposed) { this.state = { ...this.state, ...update }; this.listeners.forEach(fn => fn()); } }
  dispose() { this.disposed = true; this.controller.abort(); }
  private async run(work: () => Promise<void>) {
    if (this.state.busy || this.disposed) return;
    this.set({ busy: true, error: null });
    try { await work(); } catch (error) { this.set({ error }); }
    finally { this.set({ busy: false, loading: false }); }
  }
  load = () => this.run(async () => {
    this.set({ loading: true });
    const data = await this.api.read(this.id, this.controller.signal);
    if (this.disposed) return;
    if (data.state.status === 'COMPLETED') {
      // Review is local reading order, not a new scored run or a progress reset.
      this.set({ data, review: true, stepId: data.steps[0]?.id ?? null });
    } else {
      const started = await this.api.start(this.id);
      this.frontier = started.currentStepId;
      this.set({ data, stepId: started.currentStepId, progress: started.progress, review: started.status === 'COMPLETED' });
    }
  });
  private reviewNext() {
    const steps = this.state.data?.steps ?? [];
    return steps[steps.findIndex(s => s.id === this.state.stepId) + 1]?.id ?? null;
  }
  private showStep(stepId: string | null) {
    const steps = this.state.data?.steps ?? [];
    const frontier = this.frontier === null ? steps.length : steps.findIndex(s => s.id === this.frontier);
    this.browsingPrevious = stepId !== null && steps.findIndex(s => s.id === stepId) < frontier;
    this.set({ stepId, feedback: stepId ? this.feedbackByStep.get(stepId) ?? null : null,
      answer: stepId ? this.answersByStep.get(stepId) ?? null : null, error: null });
  }
  canContinueActivity = () => {
    const steps = this.state.data?.steps ?? [];
    const index = steps.findIndex(s => s.id === this.state.stepId);
    const frontier = this.frontier === null ? steps.length : steps.findIndex(s => s.id === this.frontier);
    return this.state.review || (index >= 0 && index < frontier && steps[index].required) || this.feedbackByStep.has(this.state.stepId ?? '');
  };
  back = () => {
    if (this.state.busy) return true;
    const steps = this.state.data?.steps ?? [];
    const index = this.state.stepId === null ? steps.length : steps.findIndex(s => s.id === this.state.stepId);
    if (index <= 0) return false;
    this.showStep(steps[index - 1].id);
    return true;
  };
  continueVisited = () => {
    if (!this.state.busy && this.canContinueActivity()) this.showStep(this.reviewNext());
  };
  continueContent = () => this.run(async () => {
    if (!this.state.stepId) return;
    if (this.canContinueActivity()) { this.showStep(this.reviewNext()); return; }
    const response = await this.api.completeStep(this.id, this.state.stepId);
    this.frontier = response.currentStepId;
    this.set({ progress: response.progress });
    this.showStep(response.currentStepId);
  });
  submit = (answer: Answer) => this.run(async () => {
    if (!this.state.stepId || this.state.feedback) return;
    const response = await this.api.attempt(this.id, this.state.stepId, answer);
    this.frontier = response.progress.currentStepId;
    this.feedbackByStep.set(this.state.stepId, response);
    this.answersByStep.set(this.state.stepId, answer);
    // Remain on this activity until the learner explicitly continues.
    this.set({ feedback: response, answer, progress: response.progress });
  });
  retryAnswer = () => { if (!this.state.busy) this.set({ feedback: null, error: null }); };
  continueFeedback = () => {
    if (this.state.busy || !this.state.feedback) return;
    this.showStep(this.state.review || this.browsingPrevious ? this.reviewNext() : this.frontier);
  };
  finish = () => this.run(async () => {
    if (this.state.result) return;
    const step = this.state.data?.steps.find(s => s.id === this.state.stepId);
    if (!this.state.review && step?.type === 'SUMMARY_STEP') {
      const traversed = await this.api.completeStep(this.id, step.id);
      this.set({ progress: traversed.progress });
      if (traversed.currentStepId) { this.set({ stepId: traversed.currentStepId }); return; }
    }
    const result = await this.api.complete(this.id);
    this.set({ result });
  });
  revisit = (stepId: string) => {
    if (this.state.busy) return;
    // Previous steps are local navigation, never a restart or a progress mutation.
    const steps = this.state.data?.steps ?? [];
    const target = steps.findIndex(s => s.id === stepId);
    const current = this.state.stepId ? steps.findIndex(s => s.id === this.state.stepId) : steps.length;
    if (target >= 0 && target < current) this.showStep(stepId);
  };
}
