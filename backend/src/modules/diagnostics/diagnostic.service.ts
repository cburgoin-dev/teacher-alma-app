import { createHash } from 'node:crypto';
import type { Prisma } from '../../generated/prisma/client.js';
import { HttpError } from '../../shared/http-error.js';
import { checkAnswer, publicActivity } from '../activities/activity.engine.js';
import { courseProgress } from '../courses/course.progression.js';
import { isVisible } from '../courses/course.rules.js';
import { courseAccess } from '../courses/course.service.js';
import { availableDiagnostic, usefulDestinations } from './diagnostic.availability.js';
import { scoreDiagnostic } from './diagnostic.scoring.js';
import type { DiagnosticDefinition, DiagnosticRepository, DiagnosticRun, DiagnosticSession } from './diagnostic.repository.js';

function fail(status: number, code: string): never { throw new HttpError(status, code, code); }
function requestKey(value: unknown, code: string): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{16,100}$/.test(value)) fail(400, code);
  return value;
}
function question(definition: DiagnosticDefinition, index: number) {
  const q = definition.diagnosticQuestions[index]!;
  return { id: q.id, position: index + 1, totalQuestions: definition.diagnosticQuestions.length, activity: publicActivity(q.activity) };
}
function active(run: DiagnosticRun, answeredQuestions: number) {
  return { attempt: { id: run.id, status: 'ACTIVE', answeredQuestions, totalQuestions: run.diagnostic.diagnosticQuestions.length },
    question: question(run.diagnostic, answeredQuestions) };
}
function canonical(value: Prisma.InputJsonObject): Prisma.InputJsonObject {
  if (!Array.isArray(value.pairs)) return value;
  return { pairs: [...value.pairs].sort((a, b) => {
    const left = a as { wordId: string }, right = b as { wordId: string };
    return left.wordId < right.wordId ? -1 : left.wordId > right.wordId ? 1 : 0;
  }) };
}
function receipt(value: unknown): Prisma.InputJsonValue { return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue; }

export class DiagnosticService {
  constructor(private readonly repository: DiagnosticRepository, private readonly clock: () => Date = () => new Date()) {}
  metadata() {
    return this.repository.read(async session => {
      const d = await availableDiagnostic(session);
      return { available: d !== null, diagnostic: d ? { id: d.id, title: d.title, version: d.version,
        questionCount: d.diagnosticQuestions.length, estimatedMinutes: d.estimatedMinutes } : null };
    });
  }
  private async owned(session: DiagnosticSession, userId: string, id: string) {
    const run = await session.findAttempt(userId, id);
    if (!run) fail(404, 'DIAGNOSTIC_ATTEMPT_NOT_FOUND');
    return run;
  }
  start(userId: string, key: unknown) {
    const validatedKey = requestKey(key, 'INVALID_DIAGNOSTIC_REQUEST_KEY');
    return this.repository.write(userId, async session => {
      const existing = await session.findKey(userId, validatedKey);
      if (existing) {
        if (existing.status !== 'ACTIVE') fail(409, 'DIAGNOSTIC_START_REQUEST_CONFLICT');
        // Replay the original initial outcome, never a learner-facing Resume.
        return active(existing, 0);
      }
      await session.lockPublication();
      const definition = await availableDiagnostic(session);
      if (!definition) fail(409, 'DIAGNOSTIC_UNAVAILABLE');
      await session.abandonActive(userId, this.clock());
      return active(await session.create({ userId, diagnosticId: definition.id, requestKey: validatedKey, status: 'ACTIVE' }), 0);
    });
  }
  private async projectResult(session: DiagnosticSession, run: DiagnosticRun, userId: string) {
    const courses = session.courses();
    const c = run.recommendedCourseId ? await courses.findCourse(run.recommendedCourseId, userId) : null;
    const recommendedCourse = c && isVisible(c) ? { id: c.id, title: c.title, description: c.description,
      level: c.level, coverUrl: c.coverUrl, status: c.status, progress: c.courseProgress.length ? courseProgress(c) : null,
      access: courseAccess(c, await courses.findEntitlements(userId), this.clock()) } : null;
    return { attemptId: run.id, completedAt: run.completedAt!.toISOString(), recommendedLevel: run.recommendedLevel!,
      recommendedCourse, strengths: null, reinforcementAreas: null };
  }
  result(userId: string) {
    return this.repository.read(async session => {
      const run = await session.latest(userId);
      if (!run) fail(404, 'DIAGNOSTIC_RESULT_NOT_FOUND');
      return { result: await this.projectResult(session, run, userId) };
    });
  }
  submit(userId: string, attemptId: string, questionId: string, key: unknown, input: unknown) {
    const validatedKey = requestKey(key, 'INVALID_DIAGNOSTIC_SUBMISSION_REQUEST_KEY');
    return this.repository.write(userId, async session => {
      await session.lockAttempt(attemptId, userId);
      const run = await this.owned(session, userId, attemptId);
      const previous = run.diagnosticAnswers.find(a => a.submissionRequestKey === validatedKey);
      if (previous && previous.diagnosticQuestionId !== questionId) fail(409, 'DIAGNOSTIC_SUBMISSION_CONFLICT');
      const q = run.diagnostic.diagnosticQuestions.find(q => q.id === questionId);
      if (!q) fail(404, 'DIAGNOSTIC_QUESTION_NOT_FOUND');
      let checked: ReturnType<typeof checkAnswer>;
      try { checked = checkAnswer(q.activity, input); }
      catch (error) {
        if (previous && error instanceof HttpError) fail(409, 'DIAGNOSTIC_SUBMISSION_CONFLICT');
        throw error;
      }
      const answerData = canonical(checked.answerData);
      const hash = createHash('sha256').update(JSON.stringify({ questionId, answer: answerData })).digest('hex');
      if (previous) {
        if (previous.submissionRequestHash !== hash) fail(409, 'DIAGNOSTIC_SUBMISSION_CONFLICT');
        return previous.submissionResponse;
      }
      if (run.diagnosticAnswers.some(a => a.diagnosticQuestionId === questionId)) fail(409, 'DIAGNOSTIC_QUESTION_ALREADY_SUBMITTED');
      if (run.status !== 'ACTIVE') fail(409, 'DIAGNOSTIC_ATTEMPT_NOT_ACTIVE');
      const next = run.diagnostic.diagnosticQuestions.find(q => !run.diagnosticAnswers.some(a => a.diagnosticQuestionId === q.id));
      if (next?.id !== questionId) fail(409, 'DIAGNOSTIC_QUESTION_NOT_AVAILABLE');
      const answered = run.diagnosticAnswers.length + 1, total = run.diagnostic.diagnosticQuestions.length;
      let response: Prisma.InputJsonValue;
      if (answered === total) {
        const correct = new Set(run.diagnosticAnswers.filter(a => a.isCorrect).map(a => a.diagnosticQuestionId));
        if (checked.isCorrect) correct.add(questionId);
        const score = scoreDiagnostic(run.diagnostic.scoringConfig, run.diagnostic.diagnosticQuestions, correct);
        const destination = usefulDestinations(await session.destinations()).find(c => c.level === score.recommendedLevel);
        const completed = await session.update(run.id, { ...score, recommendedCourseId: destination?.id ?? null,
          status: 'COMPLETED', completedAt: this.clock() });
        response = receipt({ attempt: { id: run.id, status: 'COMPLETED', answeredQuestions: answered, totalQuestions: total,
          completedAt: completed.completedAt!.toISOString() }, result: await this.projectResult(session, completed, userId) });
      } else response = receipt(active(run, answered));
      // Completion and answer/receipt are committed together; any failure rolls both back.
      await session.answer({ diagnosticAttemptId: run.id, diagnosticQuestionId: questionId, answerData,
        isCorrect: checked.isCorrect, submissionRequestKey: validatedKey, submissionRequestHash: hash, submissionResponse: response });
      return response;
    });
  }
  abandon(userId: string, attemptId: string) {
    return this.repository.write(userId, async session => {
      await session.lockAttempt(attemptId, userId);
      const run = await this.owned(session, userId, attemptId);
      if (run.status === 'COMPLETED') fail(409, 'DIAGNOSTIC_ATTEMPT_NOT_ACTIVE');
      if (run.status === 'ACTIVE') await session.update(run.id, { status: 'ABANDONED', abandonedAt: this.clock() });
      return { attemptId, status: 'ABANDONED' };
    });
  }
}
