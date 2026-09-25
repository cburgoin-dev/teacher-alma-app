import { ApiError } from '../../services/api/client';
import { lessonsApi } from './api/lessons';
import type { Answer, ActivityFeedback, LessonData, LessonMode, LessonOutcome, StepProgress, LessonResult } from './types';

type State = { data: LessonData | null; stepId: string | null; progress: StepProgress | null;
  feedback: ActivityFeedback | null; answer: Answer | null; result: LessonOutcome | null; busy: boolean; loading: boolean; error: unknown; mode: LessonMode; runId: string | null; exitRequested: boolean; exited: boolean; completion: LessonResult | null };
// One instance per mounted lesson. Normal runs use server progression;
// Replay owns ephemeral traversal and first-submission correctness locally.
export class LessonFlow {
  private state: State = { data: null, stepId: null, progress: null, feedback: null, answer: null, result: null, busy: false, loading: true, error: null, mode: 'NORMAL_RUN', runId: null, exitRequested: false, exited: false, completion: null };
  private listeners = new Set<() => void>();
  private disposed = false;
  private controller = new AbortController();
  private frontier: string | null = null;
  private feedbackByStep = new Map<string, ActivityFeedback>();
  private answersByStep = new Map<string, Answer>();
  // Deduplication key only, not an authentication token. New mounted flows get new keys.
  private requestKey = `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
  private replayCompleted = new Set<string>();
  private replayFirst = new Map<string, boolean>();
  private replaySubmissions = new Map<string, number>();
  private startReplay(data: LessonData) {
    this.feedbackByStep.clear();
    this.answersByStep.clear();
    this.replayCompleted.clear();
    this.replayFirst.clear();
    this.replaySubmissions.clear();
    this.frontier = null;
    this.set({ data, mode: 'REPLAY', stepId: data.steps[0]?.id ?? null, feedback: null, answer: null, result: null });
    this.set(this.replayProgress());
  }
  private replayProgress(): Partial<State> {
    const data = this.state.data!;
    const activities = data.steps.filter(s => s.type === 'ACTIVITY_STEP');
    return { progress: { completedSteps: this.replayCompleted.size, totalSteps: data.steps.length,
      percentage: data.steps.length ? this.replayCompleted.size / data.steps.length * 100 : 0 },
      data: { ...data, activityProgress: { completed: activities.filter(s => this.replayCompleted.has(s.id)).length, total: activities.length } } };
  }
  constructor(private id: string, private api = lessonsApi) {}
  snapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private set(update: Partial<State>) { if (!this.disposed) { this.state = { ...this.state, ...update }; this.listeners.forEach(fn => fn()); } }
  dispose() { this.disposed = true; this.controller.abort(); }
  private async run(work: () => Promise<void | Partial<State>>) {
    if (this.state.busy || this.state.exited || this.disposed) return;
    this.set({ busy: true, error: null });
    let completed: void | Partial<State> = undefined;
    try { completed = await work(); } catch (error) { this.set({ error }); }
    finally { this.set({ ...completed, busy: false, loading: false }); }
  }
  load = () => this.run(async () => {
    this.set({ loading: true });
    const data = await this.api.read(this.id, this.controller.signal);
    if (this.disposed) return;
    if (data.state.status === 'COMPLETED') {
      this.startReplay(data);
    } else {
      let started;
      try { started = await this.api.start(this.id, this.requestKey); }
      catch (error) {
        if (error instanceof ApiError && error.code === 'LESSON_ALREADY_COMPLETED') {
          const fresh = await this.api.read(this.id, this.controller.signal);
          if (!this.disposed && fresh.state.status === 'COMPLETED') { this.startReplay(fresh); return; }
        }
        throw error;
      }
      if (this.disposed) return;
      this.frontier = started.currentStepId;
      this.set({ data: { ...data, activityProgress: started.activityProgress }, completion: started.completion ?? null, runId: started.runId, stepId: started.completion ? data.steps.find(s => s.type === 'SUMMARY_STEP')?.id ?? null : started.currentStepId, progress: started.progress, mode: 'NORMAL_RUN' });
    }
  });
  private orderedNext() {
    const steps = this.state.data?.steps ?? [];
    return steps[steps.findIndex(s => s.id === this.state.stepId) + 1]?.id ?? null;
  }
  private showStep(stepId: string | null) {
    this.set({ stepId, feedback: stepId ? this.feedbackByStep.get(stepId) ?? null : null,
      answer: stepId ? this.answersByStep.get(stepId) ?? null : null, error: null });
  }
  back = () => {
    if (this.state.busy) return true;
    if (this.state.mode === 'NORMAL_RUN' && this.state.completion) return false;
    if (this.state.mode === 'NORMAL_RUN') { this.set({ exitRequested: true }); return true; }
    const steps = this.state.data?.steps ?? [];
    const index = this.state.stepId === null ? steps.length : steps.findIndex(s => s.id === this.state.stepId);
    if (index <= 0) return false;
    this.showStep(steps[index - 1].id);
    return true;
  };
  cancelExit = () => { if (!this.state.busy) this.set({ exitRequested: false }); };
  confirmExit = () => {
    if (!this.state.exitRequested || this.state.busy || this.state.exited || this.state.mode !== 'NORMAL_RUN') return;
    // Dispatch once and leave immediately, even on a hung/offline network.
    // A subsequent start replaces stale ACTIVE runs; this request targets only this run id.
    if (this.state.runId) void this.api.abandon(this.id, this.state.runId).catch(() => {});
    this.set({ exitRequested: false, exited: true });
  };
  continueContent = () => this.run(async () => {
    if (!this.state.stepId) return;
    if (this.state.completion) { this.showStep(this.postCompletionStep()); return; }
    if (this.state.mode === 'REPLAY') {
      const step = this.state.data?.steps.find(s => s.id === this.state.stepId);
      if (step?.type !== 'CONTENT_STEP') return;
      this.replayCompleted.add(step.id);
      this.set(this.replayProgress());
      this.showStep(this.orderedNext());
      return;
    }
    const response = await this.api.completeStep(this.id, this.state.runId!, this.state.stepId);
    this.frontier = response.currentStepId;
    this.set({ completion: response.completion ?? null, progress: response.progress, data: { ...this.state.data!, activityProgress: response.activityProgress } });
    this.showStep(response.completion ? this.postCompletionStep() : response.currentStepId);
  });
  submit = async (answer: Answer) => {
    await this.run(async () => {
      if (!this.state.stepId || this.state.feedback) return;
      if (this.state.completion) {
        const checked = await this.api.replayCheck(this.id, this.state.stepId, answer);
        const feedback: ActivityFeedback = { ...checked, mode: 'REPLAY', submissionNumber: 2 };
        return { feedback, answer };
      }
      if (this.state.mode === 'REPLAY') {
        const stepId = this.state.stepId;
        if (this.state.data?.steps.find(s => s.id === stepId)?.type !== 'ACTIVITY_STEP') return;
        const checked = await this.api.replayCheck(this.id, stepId, answer);
        if (this.disposed) return;
        const submissionNumber = (this.replaySubmissions.get(stepId) ?? 0) + 1;
        this.replaySubmissions.set(stepId, submissionNumber);
        if (!this.replayFirst.has(stepId)) this.replayFirst.set(stepId, checked.isCorrect);
        this.replayCompleted.add(stepId);
        const feedback: ActivityFeedback = { ...checked, mode: 'REPLAY', submissionNumber };
        this.feedbackByStep.set(stepId, feedback);
        this.answersByStep.set(stepId, answer);
        return { ...this.replayProgress(), feedback, answer };
      }
      const response = await this.api.attempt(this.id, this.state.runId!, this.state.stepId, answer);
      this.frontier = response.progress.currentStepId;
      this.feedbackByStep.set(this.state.stepId, response);
      this.answersByStep.set(this.state.stepId, answer);
      // Publish feedback atomically with run's busy release. The first visible
      // feedback is ready for Continue; no intermediate disabled CTA snapshot.
      return { completion: response.completion ?? null, feedback: response, answer, progress: response.progress,
        data: this.state.data ? { ...this.state.data, activityProgress: response.activityProgress } : null };
    });
  };
  rememberAnswer = (answer: Answer) => {
    if (this.state.busy || this.state.feedback || !this.state.stepId) return;
    this.answersByStep.set(this.state.stepId, answer);
  };
  retryAnswer = () => {
    if (this.state.busy) return;
    if (this.state.mode === 'REPLAY' && this.state.stepId) {
      this.feedbackByStep.delete(this.state.stepId);
      const answer = this.answersByStep.get(this.state.stepId);
      if (answer && 'pairs' in answer) this.answersByStep.set(this.state.stepId, { pairs: [] });
    }
    this.set({ feedback: null, error: null });
  };
  private postCompletionStep() {
    const steps = this.state.data?.steps ?? [];
    const index = steps.findIndex(s => s.id === this.state.stepId);
    return steps.slice(index + 1).find(s => s.type === 'SUMMARY_STEP')?.id ?? null;
  }
  continueFeedback = () => {
    if (this.state.busy || !this.state.feedback) return;
    this.showStep(this.state.completion ? this.postCompletionStep() : this.state.mode === 'REPLAY' ? this.orderedNext() : this.frontier);
  };
  finish = () => this.run(async () => {
    if (this.state.result) return;
    if (this.state.completion) return { result: this.state.completion };
    const step = this.state.data?.steps.find(s => s.id === this.state.stepId);
    if (this.state.mode === 'REPLAY') {
      if (step?.type === 'SUMMARY_STEP') {
        this.replayCompleted.add(step.id);
        this.set(this.replayProgress());
        const next = this.orderedNext();
        if (next) { this.showStep(next); return; }
      }
      const data = this.state.data!;
      const pending = data.steps.find(s => !this.replayCompleted.has(s.id));
      if (pending) { this.showStep(pending.id); return; }
      const totalActivities = data.steps.filter(s => s.type === 'ACTIVITY_STEP').length;
      const correctAnswers = [...this.replayFirst.values()].filter(Boolean).length;
      return { progress: { completedSteps: data.steps.length, totalSteps: data.steps.length, percentage: 100 },
        result: { mode: 'REPLAY', lesson: { id: data.lesson.id, title: data.lesson.title }, course: data.lesson.course,
          result: { correctAnswers, totalActivities, isPerfect: totalActivities > 0 && correctAnswers === totalActivities } } };
    }
    const result = await this.api.complete(this.id, this.state.runId!);
    return { result, completion: result, progress: this.state.progress ? { ...this.state.progress, percentage: 100 } : null };
  });
  revisit = (stepId: string) => {
    if (this.state.busy || this.state.mode !== 'REPLAY') return;
    // Previous steps are local navigation, never a restart or a progress mutation.
    const steps = this.state.data?.steps ?? [];
    const target = steps.findIndex(s => s.id === stepId);
    const current = this.state.stepId ? steps.findIndex(s => s.id === this.state.stepId) : steps.length;
    if (target >= 0 && target < current) this.showStep(stepId);
  };
}
