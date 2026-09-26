export type Pair = { wordId: string; imageId: string };
export type Segment = { text: string; emphasis?: 'KEY' };
export type AudioMetadata = { audioUrl?: string; audioAlt?: string };
export type DialogueTurn = AudioMetadata & { text: string; segments?: Segment[]; speakerLabel?: string; translation?: string };
export type ActivityContext = (AudioMetadata & { type: 'TEXT'; text: string })
  | (DialogueTurn & { type: 'DIALOGUE' }) | { type: 'IMAGE'; url: string; alt: string; caption?: string };
type ActivityBase = { id: string; prompt: string; hint?: string; instruction?: string; context?: ActivityContext };
export type Activity = ActivityBase & (
  | { type: 'MULTIPLE_CHOICE' | 'FILL_BLANK_OPTIONS'; options: { id: string; text: string }[] }
  | { type: 'FILL_BLANK_TEXT'; caseSensitive: boolean }
  | { type: 'MATCH_WORD_IMAGE'; interactionMode: 'TAP' | 'DRAG'; words: { id: string; text: string }[]; images: { id: string; url: string; alt: string }[] }
);
export type Answer = { selectedOptionId: string } | { text: string } | { pairs: Pair[] };
export type Block = { id: string } & (
  | { type: 'TEXT'; title?: string; body?: string; segments?: Segment[] }
  | { type: 'IMAGE'; url?: string; alt?: string; caption?: string }
  | { type: 'VIDEO'; url?: string; title?: string; posterUrl?: string; caption?: string }
  | ({ type: 'EXAMPLE'; title?: string; primaryText?: string; secondaryText?: string; note?: string } & ({ variant?: never; turns?: never } | { variant: 'DIALOGUE'; turns: DialogueTurn[] }))
  | { type: 'SUMMARY'; title?: string; points?: string[]; subtitle?: string; takeaways?: { text: string; segments?: Segment[] }[]; keyPhrases?: (AudioMetadata & { text: string; translation?: string })[] }
  | { type: 'ACTIVITY'; activity: Activity }
);
export type Step = { id: string; type: 'CONTENT_STEP' | 'ACTIVITY_STEP' | 'SUMMARY_STEP'; required: boolean; blocks: Block[] };
export type LessonStatus = 'NOT_STARTED' | 'COMPLETED';
export type LessonMode = 'NORMAL_RUN' | 'REPLAY';
export type LessonData = {
  lesson: { id: string; title: string; description: string | null; accessType: string;
    topic: { id: string; title: string }; course: { id: string; title: string; level: string | null };
    position: { lesson: number; totalLessons: number } };
  state: { status: LessonStatus; canStart: boolean; lockReason: string | null; currentStepId: string | null };
  steps: Step[];
  activityProgress?: { completed: number; total: number };
};
export type StepProgress = { completedSteps: number; totalSteps: number; percentage: number };
export type StartResponse = { runId: string; lessonId: string; status: 'ACTIVE' | 'COMPLETED'; completion: LessonResult | null; firstStepId: string; currentStepId: string | null; progress: StepProgress; activityProgress: { completed: number; total: number } };
export type StepResponse = { status: 'ACTIVE' | 'COMPLETED'; completion: LessonResult | null; runId: string; activityProgress: { completed: number; total: number }; lessonId: string; completedStepId: string; currentStepId: string | null; progress: StepProgress };
export type AttemptResponse = {
  status: 'ACTIVE' | 'COMPLETED'; completion: LessonResult | null;
  runId: string; activityProgress: { completed: number; total: number };
  attempt: { id: string; attemptNumber: number; isCorrect: boolean; countsForLessonScore: boolean };
  feedback: { message: string; correctAnswer?: unknown; explanation?: string }; reinforcement: { onCompletion: boolean };
  progress: StepProgress & { currentStepId: string | null };
};
export type LessonResult = {
  mode?: never;
  course?: { id: string; title: string; level: string | null };
  lesson: { id: string; title: string };
  result: { correctAnswers: number; totalActivities: number; isPerfect: boolean; pendingReviewCount: number };
  courseProgress: { completedLessons: number; totalLessons: number; percentage: number; status: string };
  nextLesson: { id: string; title: string; accessible: boolean; lockReason: string | null } | null;
};
export type ReplayCheckResponse = { isCorrect: boolean; feedback: AttemptResponse['feedback'] };
// This is local UI history, not a persisted attempt or an API response.
export type ReplayFeedback = ReplayCheckResponse & { mode: 'REPLAY'; submissionNumber: number };
export type ActivityFeedback = AttemptResponse | ReplayFeedback;
export type ReplayResult = {
  mode: 'REPLAY';
  lesson: LessonResult['lesson'];
  course: LessonData['lesson']['course'];
  result: { correctAnswers: number; totalActivities: number; isPerfect: boolean };
};
export type LessonOutcome = LessonResult | ReplayResult;
