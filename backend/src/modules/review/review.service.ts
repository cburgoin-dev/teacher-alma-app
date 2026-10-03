import { recordLearningCompletion } from '../gamification/gamification.service.js';
import { createHash, randomUUID } from 'node:crypto';
import { HttpError } from '../../shared/http-error.js';
import { isUuid } from '../../shared/auth.js';
import { isReviewEligible } from './review.rules.js';
import { checkAnswer, publicActivity } from '../lessons/lesson.activity.js';
import type { PrismaReviewRepository, ReviewRecord, ReviewSession } from './review.repository.js';
import type { ReviewBatchToken } from './review.token.js';

export function publicReviewActivity(activity: ReviewRecord['activity']) {
  const { hint: _hint, ...publicData } = publicActivity(activity);
  return publicData;
}

function fail(status: number, code: string): never { throw new HttpError(status, code, code); }
function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => JSON.stringify(k) + ':' + canonical(v)).join(',') + '}';
  return JSON.stringify(value) ?? 'undefined';
}
export class ReviewService {
  constructor(private readonly repository: PrismaReviewRepository, private readonly tokens: ReviewBatchToken,
    private readonly clock: () => Date = () => new Date()) {}
  private async eligible(session: ReviewSession, userId: string) {
    const entitlements = await session.findEntitlements(userId), now = this.clock();
    return (await session.findActive(userId)).filter(item => isReviewEligible(item, entitlements, now))
    .sort((a, b) => (a.lastReviewedAt?.getTime() ?? -Infinity) - (b.lastReviewedAt?.getTime() ?? -Infinity)
      || a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
  }
  read(userId: string) {
    return this.repository.read(async session => {
      const items = await this.eligible(session, userId);
      const groups = new Map<string, { topic: { id: string; title: string }; count: number }>();
      for (const item of items) {
        const topic = item.sourceLesson!.topic;
        const group = groups.get(topic.id) ?? { topic: { id: topic.id, title: topic.title }, count: 0 };
        group.count++; groups.set(topic.id, group);
      }
      return { state: items.length ? 'READY' : 'EMPTY', pendingCount: items.length, groups: [...groups.values()] };
    });
  }
  batch(userId: string, preferredLessonId: unknown) {
    if (preferredLessonId != null && !isUuid(preferredLessonId)) fail(400, 'INVALID_LESSON_ID');
    return this.repository.read(async session => {
      const eligible = await this.eligible(session, userId);
      const selected = [...eligible.filter(i => i.sourceLessonId === preferredLessonId),
        ...eligible.filter(i => i.sourceLessonId !== preferredLessonId)].slice(0, 5);
      return { batchToken: selected.length ? this.tokens.issue(userId, selected.map(i => ({
        id: i.id, activityId: i.activityId, sourceLessonId: i.sourceLessonId,
      })), this.clock()) : null, items: selected.map(item => this.publicItem(item)), totalEligiblePending: eligible.length };
    });
  }
  private publicItem(item: ReviewRecord) {
    const lesson = item.sourceLesson!, topic = lesson.topic, course = topic.course;
    const activity = publicReviewActivity(item.activity);
    return { id: item.id, source: { lesson: { id: lesson.id, title: lesson.title },
      topic: { id: topic.id, title: topic.title }, course: { id: course.id, title: course.title, level: course.level } }, activity };
  }
  attempt(userId: string, itemId: unknown, body: unknown) {
    if (!isUuid(itemId)) fail(400, 'INVALID_REVIEW_ITEM_ID');
    const input = (body && typeof body === 'object' && !Array.isArray(body) ? body : {}) as Record<string, unknown>;
    const key = input.requestKey;
    if (typeof key !== 'string' || !/^[a-zA-Z0-9_-]{16,100}$/.test(key)) fail(400, 'INVALID_REVIEW_REQUEST_KEY');
    const hash = createHash('sha256').update(canonical({ itemId, body: input })).digest('hex');
    return this.repository.write(userId, async session => {
      const authorized = this.tokens.verify(input.batchToken, userId, itemId, this.clock());
      const prior = await session.findRequest(userId, key);
      if (prior) {
        if (prior.reviewRequestHash !== hash) fail(400, 'INVALID_REVIEW_REQUEST_KEY');
        return prior.reviewResult;
      }
      const item = await session.findItem(itemId, userId);
      if (!item) fail(404, 'REVIEW_ITEM_NOT_FOUND');
      if (item.activityId !== authorized.activityId || item.sourceLessonId !== authorized.sourceLessonId) fail(403, 'REVIEW_BATCH_INVALID');
      if (item.status !== 'ACTIVE') fail(409, 'REVIEW_ITEM_NOT_ACTIVE');
      if (await session.findBatchAttempt(item.id, authorized.batchId)) fail(403, 'REVIEW_BATCH_INVALID');
      const checked = checkAnswer(item.activity, input.answer);
      const attemptNumber = ((await session.lastAttempt(item.id))?.attemptNumber ?? 0) + 1;
      const now = this.clock(), status = checked.isCorrect ? 'RESOLVED' : 'ACTIVE', id = randomUUID();
      await session.updateItem(item.id, { lastReviewedAt: now, status, resolvedAt: checked.isCorrect ? now : null,
        ...(!checked.isCorrect ? { incorrectAttempts: { increment: 1 } } : {}) });
      const result = { reviewItem: { id: item.id, status }, attempt: { id, attemptNumber, isCorrect: checked.isCorrect },
        feedback: { message: checked.isCorrect ? 'Correct answer' : 'Incorrect answer', correctAnswer: checked.correctAnswer,
          ...(item.activity.explanation ? { explanation: item.activity.explanation } : {}) },
        pendingReviewCount: (await this.eligible(session, userId)).length };
      await session.createAttempt({ id, userId, activityId: item.activityId, lessonId: item.sourceLessonId, runId: null,
        reviewItemId: item.id, context: 'REVIEW', answerData: checked.answerData, isCorrect: checked.isCorrect, attemptNumber,
        reviewBatchId: authorized.batchId, reviewRequestKey: key, reviewRequestHash: hash, reviewResult: result });
      const submitted = new Set((await session.completedBatchItems(userId, authorized.batchId)).map(a => a.reviewItemId));
      if (authorized.batchItemIds.every(id => submitted.has(id))) {
        const gamification = await recordLearningCompletion(session.gamification(), { userId, eventType: 'REVIEW_COMPLETION',
          sourceType: 'REVIEW_BATCH', sourceId: authorized.batchId, occurredAt: now }, now);
        const completed = { ...result, gamification };
        await session.saveResult(id, completed);
        return completed;
      }
      return result;
    });
  }
}
