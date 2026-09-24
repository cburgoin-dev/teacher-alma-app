import { lessonsApi } from './api/lessons';
import type { Answer, ActivityFeedback, LessonData, LessonMode, LessonOutcome, StepProgress } from './types';

type State = { data: LessonData | null; stepId: string | null; progress: StepProgress | null;
  feedback: ActivityFeedback | null; answer: Answer | null; result: LessonOutcome | null; busy: boolean; loading: boolean; error: unknown; mode: LessonMode };
// One instance per mounted lesson. Normal/Resume use server progression;
// Replay owns ephemeral traversal and first-submission correctness locally.
export class LessonFlow {
  private state: State = { data: null, stepId: null, progress: null, feedback: null, answer: null, result: null, busy: false, loading: true, error: null, mode: 'NORMAL' };
  private listeners = new Set<() => void>();
  private disposed = false;
  private controller = new AbortController();
  private frontier: string | null = null;
  private feedbackByStep = new Map<string, ActivityFeedback>();
  private answersByStep = new Map<string, Answer>();
  private browsingPrevious = false;
  private activityReadVersion = 0;
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
    if (this.state.busy || this.disposed) return;
    this.set({ busy: true, error: null });
    let completed: void | Partial<State> = undefined;
    try { completed = await work(); } catch (error) { this.set({ error }); }
    finally { this.set({ ...completed, busy: false, loading: false }); }
  }
  load = () => this.run(async () => {
    ++this.activityReadVersion;
    this.set({ loading: true });
    const data = await this.api.read(this.id, this.controller.signal);
    if (this.disposed) return;
    if (data.state.status === 'COMPLETED') {
      this.startReplay(data);
    } else {
      const started = await this.api.start(this.id);
      if (started.status === 'COMPLETED') { this.startReplay(data); return; }
      this.frontier = started.currentStepId;
      this.set({ data, stepId: started.currentStepId, progress: started.progress, mode: data.state.status === 'IN_PROGRESS' ? 'RESUME' : 'NORMAL' });
    }
  });
  private orderedNext() {
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
    if (this.state.mode === 'REPLAY') return false; // Replay never exposes historical skip/visited actions.
    return (index >= 0 && index < frontier && steps[index].required) || this.feedbackByStep.has(this.state.stepId ?? '');
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
    if (!this.state.busy && this.canContinueActivity()) this.showStep(this.orderedNext());
  };
  continueContent = () => this.run(async () => {
    if (!this.state.stepId) return;
    if (this.state.mode === 'REPLAY') {
      const step = this.state.data?.steps.find(s => s.id === this.state.stepId);
      if (step?.type !== 'CONTENT_STEP') return;
      this.replayCompleted.add(step.id);
      this.set(this.replayProgress());
      this.showStep(this.orderedNext());
      return;
    }
    if (this.canContinueActivity()) { this.showStep(this.orderedNext()); return; }
    const response = await this.api.completeStep(this.id, this.state.stepId);
    this.frontier = response.currentStepId;
    this.set({ progress: response.progress });
    this.showStep(response.currentStepId);
  });
  private async refreshActivityProgress(version: number) {
    try {
      const fresh = await this.api.read(this.id, this.controller.signal);
      if (!this.disposed && version === this.activityReadVersion && this.state.data) {
        this.set({ data: { ...this.state.data, activityProgress: fresh.activityProgress } });
      }
    } catch {
      // Optional display metadata: omit it if unavailable. Never retry an attempt
      // or block Continue because this independent read failed.
    }
  }
  submit = async (answer: Answer) => {
    let refreshVersion: number | undefined;
    await this.run(async () => {
      if (!this.state.stepId || this.state.feedback) return;
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
      // Invalidate a previous metadata read before starting a new attempt.
      const version = ++this.activityReadVersion;
      const response = await this.api.attempt(this.id, this.state.stepId, answer);
      this.frontier = response.progress.currentStepId;
      this.feedbackByStep.set(this.state.stepId, response);
      this.answersByStep.set(this.state.stepId, answer);
      // Publish feedback atomically with run's busy release. The first visible
      // feedback is ready for Continue; no intermediate disabled CTA snapshot.
      refreshVersion = version;
      return { feedback: response, answer, progress: response.progress,
        data: this.state.data ? { ...this.state.data, activityProgress: undefined } : null };
    });
    if (refreshVersion !== undefined && !this.disposed) void this.refreshActivityProgress(refreshVersion);
  };
  rememberAnswer = (answer: Answer) => {
    if (this.state.mode !== 'REPLAY' || this.state.busy || this.state.feedback || !this.state.stepId) return;
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
  continueFeedback = () => {
    if (this.state.busy || !this.state.feedback) return;
    this.showStep(this.state.mode === 'REPLAY' || this.browsingPrevious ? this.orderedNext() : this.frontier);
  };
  finish = () => this.run(async () => {
    if (this.state.result) return;
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
    if (step?.type === 'SUMMARY_STEP') {
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
