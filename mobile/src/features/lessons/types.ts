export type Pair = { wordId: string; imageId: string };
type ActivityBase = { id: string; prompt: string; hint?: string };
export type Activity = ActivityBase & (
  | { type: 'MULTIPLE_CHOICE' | 'FILL_BLANK_OPTIONS'; options: { id: string; text: string }[] }
  | { type: 'FILL_BLANK_TEXT'; caseSensitive: boolean }
  | { type: 'MATCH_WORD_IMAGE'; interactionMode: 'TAP' | 'DRAG'; words: { id: string; text: string }[]; images: { id: string; url: string; alt: string }[] }
);
export type Answer = { selectedOptionId: string } | { text: string } | { pairs: Pair[] };
export type Block = { id: string } & (
  | { type: 'TEXT'; title?: string; body?: string }
  | { type: 'IMAGE'; url?: string; alt?: string; caption?: string }
  | { type: 'VIDEO'; url?: string; title?: string; posterUrl?: string; caption?: string }
  | { type: 'EXAMPLE'; title?: string; primaryText?: string; secondaryText?: string; note?: string }
  | { type: 'SUMMARY'; title?: string; points?: string[] }
  | { type: 'ACTIVITY'; activity: Activity }
);
export type Step = { id: string; type: 'CONTENT_STEP' | 'ACTIVITY_STEP' | 'SUMMARY_STEP'; required: boolean; blocks: Block[] };
export type LessonStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
export type LessonData = {
  lesson: { id: string; title: string; description: string | null; accessType: string;
    topic: { id: string; title: string }; course: { id: string; title: string; level: string | null };
    position: { lesson: number; totalLessons: number } };
  state: { status: LessonStatus; canStart: boolean; lockReason: string | null; currentStepId: string | null };
  steps: Step[];
};
export type StepProgress = { completedSteps: number; totalSteps: number; percentage: number };
export type StartResponse = { lessonId: string; status: LessonStatus; currentStepId: string | null; progress: StepProgress };
export type StepResponse = { lessonId: string; completedStepId: string; currentStepId: string | null; progress: StepProgress };
export type AttemptResponse = {
  attempt: { id: string; attemptNumber: number; isCorrect: boolean; countsForLessonScore: boolean };
  feedback: { message: string; correctAnswer?: unknown; explanation?: string }; review: { pending: boolean };
  progress: StepProgress & { currentStepId: string | null };
};
export type LessonResult = {
  lesson: { id: string; title: string };
  result: { correctAnswers: number; totalActivities: number; isPerfect: boolean; pendingReviewCount: number };
  courseProgress: { completedLessons: number; totalLessons: number; percentage: number; status: string };
  nextLesson: { id: string; title: string; accessible: boolean; lockReason: string | null } | null;
};
