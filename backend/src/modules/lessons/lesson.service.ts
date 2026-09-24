import { publicContent } from './lesson.content.js';
import { HttpError } from '../../shared/http-error.js';
import { entitlementSource } from '../courses/course.rules.js';
import { progress as courseProgress } from '../courses/course.service.js';
import { checkAnswer, publicActivity } from './lesson.activity.js';
import { deriveSteps, nextRequiredStep, requireStep, requireStepAvailable, stepCompleted } from './lesson.steps.js';
import type { LessonBlockRecord, LessonRecord, LessonSession, PrismaLessonRepository } from './lesson.repository.js';

function fail(status: number, code: string, message: string): never { throw new HttpError(status, code, message); }
const publishedPath = (lesson: LessonRecord) => lesson.topic.course.topics.flatMap(t => t.lessons).filter(l => l.status === 'PUBLISHED');
const completedBlocks = (lesson: LessonRecord) => new Set(lesson.lessonBlocks.filter(b => b.lessonBlockProgress[0]?.status === 'COMPLETED').map(b => b.id));

export function activityProgress(lesson: Pick<LessonRecord, 'lessonBlocks'>) {
  const activities = lesson.lessonBlocks.filter(block => block.type === 'ACTIVITY');
  return { completed: activities.filter(block => block.lessonBlockProgress[0]?.status === 'COMPLETED').length, total: activities.length };
}

function stepProgress(lesson: LessonRecord) {
  const steps = deriveSteps(lesson.lessonBlocks);
  const completed = completedBlocks(lesson);
  const completedSteps = steps.filter(s => stepCompleted(s, completed)).length;
  const stored = lesson.lessonProgress[0];
  const pending = nextRequiredStep(steps, completed);
  return { currentStepId: !stored || stored.status === 'COMPLETED' ? null : pending?.id ?? null,
    completedSteps, totalSteps: steps.length, percentage: steps.length ? completedSteps / steps.length * 100 : 0 };
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
        state: { status: lesson.lessonProgress[0]?.status ?? 'NOT_STARTED', canStart: course.courseProgress.length > 0 && steps.length > 0,
          lockReason: null, currentStepId: stepProgress(lesson).currentStepId }, steps, activityProgress: activityProgress(lesson) };
    });
  }

  start(lessonId: string, userId: string) {
    return this.repository.write(userId, async session => {
      let { lesson } = await this.resolve(session, lessonId, userId, true);
      const steps = deriveSteps(lesson.lessonBlocks);
      if (!steps.length) fail(409, 'LESSON_HAS_NO_CONTENT', 'Lesson has no available content');
      steps.forEach(s => s.blocks.forEach(publicBlock));
      if (!lesson.lessonProgress.length) {
        await session.createProgress(userId, lessonId, steps[0]!.id);
        lesson = (await session.findLesson(lessonId, userId))!;
      }
      const { currentStepId, ...progress } = stepProgress(lesson);
      return { lessonId, status: lesson.lessonProgress[0]!.status, currentStepId, progress };
    });
  }

  private requireStarted(lesson: LessonRecord) {
    if (!lesson.lessonProgress.length) fail(409, 'LESSON_NOT_STARTED', 'Start the lesson first');
  }

  private async traverse(session: LessonSession, lesson: LessonRecord, blockIds: string[], userId: string) {
    const done = completedBlocks(lesson);
    const missing = blockIds.filter(id => !done.has(id));
    if (missing.length) await session.completeBlocks(userId, missing, this.clock());
    missing.forEach(id => done.add(id));
    if (lesson.lessonProgress[0]!.status !== 'COMPLETED') {
      const next = nextRequiredStep(deriveSteps(lesson.lessonBlocks), done);
      const currentBlockId = next?.id ?? null;
      if (currentBlockId !== lesson.lessonProgress[0]!.currentBlockId) {
        await session.updateProgress(userId, lesson.id, { currentBlock: currentBlockId ? { connect: { id: currentBlockId } } : { disconnect: true } });
      }
    }
    return stepProgress((await session.findLesson(lesson.id, userId))!);
  }

  completeStep(lessonId: string, stepId: string, userId: string) {
    return this.repository.write(userId, async session => {
      const { lesson } = await this.resolve(session, lessonId, userId, true);
      this.requireStarted(lesson);
      const steps = deriveSteps(lesson.lessonBlocks);
      const step = requireStep(steps, stepId);
      if (step.type === 'ACTIVITY_STEP') fail(409, 'ACTIVITY_REQUIRES_ATTEMPT', 'Submit an activity attempt');
      if (!stepCompleted(step, completedBlocks(lesson))) requireStepAvailable(steps, stepId, completedBlocks(lesson));
      const { currentStepId, ...progress } = await this.traverse(session, lesson, step.blocks.map(b => b.id), userId);
      return { lessonId, completedStepId: stepId, currentStepId, progress };
    });
  }

  attempt(lessonId: string, stepId: string, userId: string, answer: unknown) {
    return this.repository.write(userId, async session => {
      const { lesson } = await this.resolve(session, lessonId, userId, true);
      this.requireStarted(lesson);
      const steps = deriveSteps(lesson.lessonBlocks);
      const step = requireStep(steps, stepId);
      if (step.type !== 'ACTIVITY_STEP') fail(409, 'STEP_IS_NOT_ACTIVITY', 'Step is not an activity');
      requireStepAvailable(steps, stepId, completedBlocks(lesson));
      const activity = step.blocks[0]!.activity;
      if (!activity) throw new Error('Missing activity');
      const checked = checkAnswer(activity, answer);
      const previous = (await session.findAttempts(userId, lessonId)).filter(a => a.activityId === activity.id);
      const attemptNumber = previous.reduce((n, a) => Math.max(n, a.attemptNumber), 0) + 1;
      let review = await session.findReview(userId, activity.id);
      if (!checked.isCorrect) review = review ? await session.incrementReview(review.id) : await session.createReview(userId, activity.id, lessonId);
      const attempt = await session.createAttempt({ userId, lessonId, activityId: activity.id, context: 'LESSON',
        answerData: checked.answerData, isCorrect: checked.isCorrect, attemptNumber, reviewItemId: review?.id ?? null });
      const progress = await this.traverse(session, lesson, step.blocks.map(b => b.id), userId);
      return { attempt: { id: attempt.id, attemptNumber, isCorrect: checked.isCorrect, countsForLessonScore: previous.length === 0 },
        feedback: { message: checked.isCorrect ? 'Correct answer' : 'Incorrect answer', correctAnswer: checked.correctAnswer,
          ...(activity.explanation ? { explanation: activity.explanation } : {}) }, review: { pending: review !== null }, progress };
    });
  }

  complete(lessonId: string, userId: string) {
    return this.repository.write(userId, async session => {
      let { lesson, source } = await this.resolve(session, lessonId, userId, true);
      this.requireStarted(lesson);
      const attempts = await session.findAttempts(userId, lessonId);
      const done = completedBlocks(lesson);
      if (lesson.lessonProgress[0]!.status !== 'COMPLETED') {
        if (!lesson.lessonBlocks.length || lesson.lessonBlocks.some(b => b.required && (b.type === 'ACTIVITY'
          ? !attempts.some(a => a.activityId === b.activityId) : !done.has(b.id)))) {
          fail(409, 'LESSON_REQUIREMENTS_INCOMPLETE', 'Complete required lesson steps first');
        }
        await session.updateProgress(userId, lessonId, { status: 'COMPLETED', completedAt: this.clock(), currentBlock: { disconnect: true } });
        lesson = (await session.findLesson(lessonId, userId))!;
      }
      const path = publishedPath(lesson);
      const progress = courseProgress(path);
      if (progress.status === 'COMPLETED') await session.completeCourse(userId, lesson.topic.course.id, this.clock());
      const ids = new Set(lesson.lessonBlocks.filter(b => b.type === 'ACTIVITY').map(b => b.activityId));
      const first = [...ids].map(id => attempts.find(a => a.activityId === id));
      const correctAnswers = first.filter(a => a?.isCorrect).length;
      const next = path.find(l => l.isRequired && l.lessonProgress[0]?.status !== 'COMPLETED');
      const accessible = next ? next.accessType === 'FREE' || (next.accessType === 'PAID' && source !== 'NONE') : false;
      return { lesson: { id: lesson.id, title: lesson.title }, course: { id: lesson.topic.course.id, title: lesson.topic.course.title, level: lesson.topic.course.level },
        result: { correctAnswers, totalActivities: ids.size, isPerfect: ids.size > 0 && correctAnswers === ids.size,
          pendingReviewCount: await session.countReviews(userId, lessonId) }, courseProgress: progress,
        nextLesson: next ? { id: next.id, title: next.title, accessible, lockReason: accessible ? null : 'ACCESS' } : null };
    });
  }
}
