import { publicContent } from './lesson.content.js';
import { HttpError } from '../../shared/http-error.js';
import { entitlementSource } from '../courses/course.rules.js';
import { progress as courseProgress } from '../courses/course.service.js';
import { checkAnswer, publicActivity } from './lesson.activity.js';
import { deriveSteps, nextRequiredStep, requireStep, requireStepAvailable, stepCompleted } from './lesson.steps.js';
import type { LessonBlockRecord, LessonRecord, LessonSession, PrismaLessonRepository, RunRecord } from './lesson.repository.js';

function fail(status: number, code: string, message: string): never { throw new HttpError(status, code, message); }
const publishedPath = (lesson: LessonRecord) => lesson.topic.course.topics.flatMap(t => t.lessons).filter(l => l.status === 'PUBLISHED');

export function activityProgress(lesson: Pick<LessonRecord, 'lessonBlocks'>) {
  const activities = lesson.lessonBlocks.filter(block => block.type === 'ACTIVITY');
  return { completed: activities.filter(block => block.lessonBlockProgress[0]?.status === 'COMPLETED').length, total: activities.length };
}

function runProgress(lesson: LessonRecord, run: RunRecord) {
  const steps = deriveSteps(lesson.lessonBlocks).filter(s => s.required && s.type !== 'SUMMARY_STEP');
  const done = new Set(run.blocks.map(b => b.lessonBlockId));
  const completedSteps = steps.filter(s => stepCompleted(s, done)).length;
  return { completedSteps, totalSteps: steps.length, percentage: run.status === 'COMPLETED' ? 100 : Math.min(99, steps.length ? completedSteps / steps.length * 100 : 0) };
}
function runActivityProgress(lesson: LessonRecord, run: RunRecord) {
  const activities = lesson.lessonBlocks.filter(b => b.type === 'ACTIVITY');
  return { completed: activities.filter(b => run.blocks.some(p => p.lessonBlockId === b.id)).length, total: activities.length };
}

function publicBlock(block: LessonBlockRecord) {
  if (block.type === 'ACTIVITY') {
    if (!block.activity) throw new Error('Activity block has no activity');
    return { id: block.id, type: block.type, activity: publicActivity(block.activity) };
  }
  return { id: block.id, type: block.type, ...publicContent(block.type, block.content) };
}

export class LessonService {
  constructor(private readonly repository: PrismaLessonRepository, private readonly clock: () => Date = () => new Date()) {}

  private async resolve(session: LessonSession, lessonId: string, userId: string, write: boolean) {
    const lesson = await session.findLesson(lessonId, userId);
    if (!lesson || lesson.status !== 'PUBLISHED' || lesson.topic.course.status !== 'PUBLISHED') fail(404, 'LESSON_NOT_FOUND', 'Lesson not found');
    const course = lesson.topic.course;
    if (write && !course.courseProgress.length) fail(409, 'COURSE_NOT_STARTED', 'Start the course first');
    const path = publishedPath(lesson);
    const before = path.slice(0, path.findIndex(l => l.id === lessonId));
    if (lesson.lessonProgress[0]?.status !== 'COMPLETED' && before.some(l => l.isRequired && l.lessonProgress[0]?.status !== 'COMPLETED')) {
      fail(409, 'LESSON_PREREQUISITE_REQUIRED', 'Complete preceding required lessons first');
    }
    const source = entitlementSource(course.id, await session.findEntitlements(userId), this.clock());
    if (lesson.accessType !== 'FREE' && (lesson.accessType !== 'PAID' || source === 'NONE')) fail(403, 'LESSON_ACCESS_REQUIRED', 'Access to this lesson is required');
    return { lesson, source };
  }

  read(lessonId: string, userId: string) {
    return this.repository.read(async session => {
      const { lesson } = await this.resolve(session, lessonId, userId, false);
      const course = lesson.topic.course;
      const path = publishedPath(lesson);
      const steps = deriveSteps(lesson.lessonBlocks).map(step => ({ ...step, blocks: step.blocks.map(publicBlock) }));
      return { lesson: { id: lesson.id, title: lesson.title, description: lesson.description, accessType: lesson.accessType,
        topic: { id: lesson.topic.id, title: lesson.topic.title }, course: { id: course.id, title: course.title, level: course.level },
        position: { lesson: path.findIndex(l => l.id === lesson.id) + 1, totalLessons: path.length } },
        state: { status: lesson.lessonProgress[0]?.status === 'COMPLETED' ? 'COMPLETED' : 'NOT_STARTED', canStart: course.courseProgress.length > 0 && steps.length > 0,
          lockReason: null, currentStepId: null }, steps, activityProgress: activityProgress(lesson) };
    });
  }

  start(lessonId: string, userId: string, requestKey: unknown) {
    if (typeof requestKey !== 'string' || !/^[a-zA-Z0-9_-]{16,100}$/.test(requestKey)) fail(400, 'INVALID_RUN_REQUEST_KEY', 'A stable requestKey is required');
    return this.repository.write(userId, async session => {
      const { lesson } = await this.resolve(session, lessonId, userId, true);
      if (lesson.lessonProgress[0]?.status === 'COMPLETED') fail(409, 'LESSON_ALREADY_COMPLETED', 'Use Replay for a completed lesson');
      const steps = deriveSteps(lesson.lessonBlocks);
      if (!steps.length) fail(409, 'LESSON_HAS_NO_CONTENT', 'Lesson has no available content');
      steps.forEach(s => s.blocks.forEach(publicBlock));
      const firstStep = steps.find(s => s.type !== 'SUMMARY_STEP') ?? steps[0]!;
      let run = await session.findRunByKey(userId, lessonId, requestKey);
      if (run) this.requireActive(run);
      else {
        await session.abandonActive(userId, lessonId, this.clock());
        run = await session.createRun(userId, lessonId, requestKey, firstStep.id);
      }
      const completion = this.ready(lesson, run) ? await this.consolidate(session, lesson, run, userId) : null;
      if (completion) run = (await session.findRun(run.id, lessonId, userId))!;
      return { completion, runId: run.id, lessonId, status: run.status, firstStepId: firstStep.id, currentStepId: run.currentBlockId,
        progress: runProgress(lesson, run), activityProgress: runActivityProgress(lesson, run) };
    });
  }
  private async requireRun(session: LessonSession, lessonId: string, runId: string, userId: string) {
    const run = await session.findRun(runId, lessonId, userId);
    if (!run) fail(404, 'LESSON_RUN_NOT_FOUND', 'Run not found');
    return run;
  }
  private requireActive(run: RunRecord) {
    if (run.status !== 'ACTIVE') fail(409, 'LESSON_RUN_NOT_ACTIVE', 'Run is no longer active');
  }
  private async traverse(session: LessonSession, lesson: LessonRecord, run: RunRecord, ids: string[]) {
    await session.completeRunBlocks(run.id, ids, this.clock());
    const done = new Set([...run.blocks.map(b => b.lessonBlockId), ...ids]);
    const next = nextRequiredStep(deriveSteps(lesson.lessonBlocks).filter(s => s.type !== 'SUMMARY_STEP'), done);
    let updated = await session.updateRun(run.id, { currentBlockId: next?.id ?? null });
    const completion = this.ready(lesson, updated) ? await this.consolidate(session, lesson, updated, run.userId) : null;
    if (completion) updated = (await session.findRun(run.id, lesson.id, run.userId))!;
    return { completion, status: updated.status, ...runProgress(lesson, updated), currentStepId: updated.currentBlockId, activityProgress: runActivityProgress(lesson, updated) };
  }
  completeStep(lessonId: string, runId: string, stepId: string, userId: string) {
    return this.repository.write(userId, async session => {
      const { lesson } = await this.resolve(session, lessonId, userId, true);
      const run = await this.requireRun(session, lessonId, runId, userId); this.requireActive(run);
      const steps = deriveSteps(lesson.lessonBlocks);
      const step = requireStep(steps, stepId);
      if (step.type === 'ACTIVITY_STEP') fail(409, 'ACTIVITY_REQUIRES_ATTEMPT', 'Submit an activity attempt');
      requireStepAvailable(steps.filter(s => s.type !== 'SUMMARY_STEP' || s.id === stepId), stepId, new Set(run.blocks.map(b => b.lessonBlockId)));
      const { completion, status, currentStepId, activityProgress, ...progress } = await this.traverse(session, lesson, run, step.blocks.map(b => b.id));
      return { completion, status, runId, lessonId, completedStepId: stepId, currentStepId, progress, activityProgress };
    });
  }
  abandon(lessonId: string, runId: string, userId: string) {
    return this.repository.write(userId, async session => {
      const run = await this.requireRun(session, lessonId, runId, userId);
      if (run.status === 'COMPLETED') fail(409, 'LESSON_RUN_NOT_ACTIVE', 'Completed runs cannot be abandoned');
      if (run.status === 'ACTIVE') await session.updateRun(run.id, { status: 'ABANDONED', abandonedAt: this.clock(), currentBlockId: null });
      return { runId, status: 'ABANDONED' };
    });
  }

  replayCheck(lessonId: string, stepId: string, userId: string, answer: unknown) {
    return this.repository.read(async session => {
      const { lesson } = await this.resolve(session, lessonId, userId, false);
      if (lesson.lessonProgress[0]?.status !== 'COMPLETED') {
        fail(409, 'LESSON_REPLAY_REQUIRES_COMPLETION', 'Complete the lesson before replaying it');
      }
      const step = requireStep(deriveSteps(lesson.lessonBlocks), stepId);
      if (step.type !== 'ACTIVITY_STEP') fail(409, 'STEP_IS_NOT_ACTIVITY', 'Step is not an activity');
      const activity = step.blocks[0]!.activity;
      if (!activity) throw new Error('Missing activity');
      const checked = checkAnswer(activity, answer);
      return { isCorrect: checked.isCorrect,
        feedback: { message: checked.isCorrect ? 'Correct answer' : 'Incorrect answer', correctAnswer: checked.correctAnswer,
          ...(activity.explanation ? { explanation: activity.explanation } : {}) } };
    });
  }

  attempt(lessonId: string, runId: string, stepId: string, userId: string, answer: unknown) {
    return this.repository.write(userId, async session => {
      const { lesson } = await this.resolve(session, lessonId, userId, true);
      const run = await this.requireRun(session, lessonId, runId, userId); this.requireActive(run);
      const steps = deriveSteps(lesson.lessonBlocks);
      const step = requireStep(steps, stepId);
      if (step.type !== 'ACTIVITY_STEP') fail(409, 'STEP_IS_NOT_ACTIVITY', 'Step is not an activity');
      requireStepAvailable(steps.filter(s => s.type !== 'SUMMARY_STEP' || s.id === stepId), stepId, new Set(run.blocks.map(b => b.lessonBlockId)));
      const activity = step.blocks[0]!.activity;
      if (!activity) throw new Error('Missing activity');
      const checked = checkAnswer(activity, answer);
      const previous = (await session.findAttempts(runId)).filter(a => a.activityId === activity.id);
      const attemptNumber = previous.reduce((n, a) => Math.max(n, a.attemptNumber), 0) + 1;
      const attempt = await session.createAttempt({ userId, lessonId, runId, activityId: activity.id, context: 'LESSON',
        answerData: checked.answerData, isCorrect: checked.isCorrect, attemptNumber });
      const { completion, status, activityProgress, ...progress } = await this.traverse(session, lesson, run, step.blocks.map(b => b.id));
      return { completion, status, runId, attempt: { id: attempt.id, attemptNumber, isCorrect: checked.isCorrect, countsForLessonScore: previous.length === 0 },
        feedback: { message: checked.isCorrect ? 'Correct answer' : 'Incorrect answer', correctAnswer: checked.correctAnswer,
          ...(activity.explanation ? { explanation: activity.explanation } : {}) },
        reinforcement: { onCompletion: !checked.isCorrect || previous.some(a => !a.isCorrect) }, progress, activityProgress };
    });
  }

  private ready(lesson: LessonRecord, run: RunRecord) {
    const done = new Set(run.blocks.map(b => b.lessonBlockId));
    return lesson.lessonBlocks.length > 0 && lesson.lessonBlocks.every(b => !b.required || b.type === 'SUMMARY' || done.has(b.id));
  }
  private async consolidate(session: LessonSession, lesson: LessonRecord, run: RunRecord, userId: string) {
    const source = entitlementSource(lesson.topic.course.id, await session.findEntitlements(userId), this.clock());
    if (run.status !== 'COMPLETED') {
      this.requireActive(run);
      const attempts = await session.findAttempts(run.id);
      const done = new Set(run.blocks.map(b => b.lessonBlockId));
      if (!this.ready(lesson, run) || lesson.lessonBlocks.some(b => b.required && b.type === 'ACTIVITY' && !attempts.some(a => a.activityId === b.activityId))) {
        fail(409, 'LESSON_REQUIREMENTS_INCOMPLETE', 'Complete required pedagogical run steps first');
      }
      const ids = new Set(lesson.lessonBlocks.filter(b => b.type === 'ACTIVITY').map(b => b.activityId!));
      const correctAnswers = [...ids].filter(id => attempts.find(a => a.activityId === id)?.isCorrect).length;
      const now = this.clock();
      run = await session.updateRun(run.id, { status: 'COMPLETED', completedAt: now, currentBlockId: null, correctAnswers, totalActivities: ids.size });
      await session.consolidateProgress(userId, lesson.id, run.id, run.startedAt, now);
      await session.completeBlocks(userId, [...done], now);
      // Count every incorrect submission in this accepted run exactly once.
      for (const activityId of ids) {
        const incorrect = attempts.filter(a => a.activityId === activityId && !a.isCorrect).length;
        if (!incorrect) continue;
        const existing = await session.findReview(userId, activityId);
        const review = existing ? await session.incrementReview(existing.id, incorrect) : await session.createReview(userId, activityId, lesson.id, incorrect);
        await session.linkReview(run.id, activityId, review.id);
      }
      lesson = (await session.findLesson(lesson.id, userId))!;
      if (courseProgress(publishedPath(lesson)).status === 'COMPLETED') await session.completeCourse(userId, lesson.topic.course.id, now);
    }
    const path = publishedPath(lesson);
    const progress = courseProgress(path);
    const next = path.find(l => l.isRequired && l.lessonProgress[0]?.status !== 'COMPLETED');
    const accessible = next ? next.accessType === 'FREE' || (next.accessType === 'PAID' && source !== 'NONE') : false;
    return { runId: run.id, lesson: { id: lesson.id, title: lesson.title }, course: { id: lesson.topic.course.id, title: lesson.topic.course.title, level: lesson.topic.course.level },
      result: { correctAnswers: run.correctAnswers!, totalActivities: run.totalActivities!, isPerfect: run.totalActivities! > 0 && run.correctAnswers === run.totalActivities,
        pendingReviewCount: await session.countReviews(userId, lesson.id) }, courseProgress: progress,
      nextLesson: next ? { id: next.id, title: next.title, accessible, lockReason: accessible ? null : 'ACCESS' } : null };

  }
  complete(lessonId: string, runId: string, userId: string) {
    return this.repository.write(userId, async session => {
      const { lesson } = await this.resolve(session, lessonId, userId, true);
      const run = await this.requireRun(session, lessonId, runId, userId);
      return this.consolidate(session, lesson, run, userId);
    });
  }
}
