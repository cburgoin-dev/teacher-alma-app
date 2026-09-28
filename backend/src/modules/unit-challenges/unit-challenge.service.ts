import type { Prisma } from '../../generated/prisma/client.js';
import { HttpError } from '../../shared/http-error.js';
import { entitlementSource, hasLessonAccess } from '../courses/course.rules.js';
import { courseProgress, nextNode, roadmapNodes } from '../courses/course.progression.js';
import { publicContent, scoreAnswer, totalItems, validateChallenge, validateContent } from './unit-challenge.content.js';
import type { ChallengePhase, ChallengeRun, PrismaUnitChallengeRepository, UnitChallengeSession } from './unit-challenge.repository.js';

function fail(status: number, code: string): never { throw new HttpError(status, code, code); }
// Presentation only; passing uses the exact item-count comparison below.
function publicPercentage(correctItems: number, totalItems: number) {
  return Math.floor(correctItems * 100 / totalItems);
}
function requestKey(value: unknown, code: string): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{16,100}$/.test(value)) fail(400, code);
  return value;
}
function publicPhase(phase: ChallengePhase) {
  return { id: phase.id, type: phase.type, position: phase.position,
    content: publicContent(validateContent(phase.type, phase.contentSnapshot)) };
}
function view(run: ChallengeRun) {
  if (run.status === 'ABANDONED') return { run: { id: run.id, status: run.status }, phase: null, result: null };
  const current = run.phases.find(p => !p.submittedAt);
  return { run: { id: run.id, status: run.status, completedPhases: run.phases.filter(p => p.submittedAt).length,
    totalPhases: run.phases.length, currentPhasePosition: current?.position ?? null },
    phase: run.status === 'ACTIVE' && current ? publicPhase(current) : null,
    ...(run.status === 'COMPLETED' ? { result: { correctItems: run.correctItems!, totalItems: run.totalItems,
      percentage: publicPercentage(run.correctItems!, run.totalItems), passed: run.passed!, passingScore: run.passingScoreSnapshot } } : {}) };
}

export class UnitChallengeService {
  constructor(private readonly repository: PrismaUnitChallengeRepository, private readonly clock: () => Date = () => new Date()) {}
  private async visible(session: UnitChallengeSession, id: string, userId: string) {
    const challenge = await session.findChallenge(id, userId);
    if (!challenge || challenge.status !== 'PUBLISHED' || challenge.topic.course.status !== 'PUBLISHED') fail(404, 'UNIT_CHALLENGE_NOT_FOUND');
    return challenge;
  }
  private async owned(session: UnitChallengeSession, id: string, runId: string, userId: string) {
    const run = await session.findRun(runId, id, userId);
    if (!run) fail(404, 'UNIT_CHALLENGE_RUN_NOT_FOUND');
    return run;
  }
  read(id: string, userId: string) {
    return this.repository.read(async session => {
      const c = await this.visible(session, id, userId);
      const course = (await session.findCourse(c.topic.courseId, userId))!;
      const source = entitlementSource(course.id, await session.findEntitlements(userId), this.clock());
      const node = roadmapNodes(course, source).find(n => n.type === 'UNIT_CHALLENGE' && n.id === id)!;
      const active = c.runs.find(r => r.status === 'ACTIVE');
      const completed = c.runs.filter(r => r.status === 'COMPLETED');
      return { challenge: { id: c.id, title: c.title, description: c.description, passingScore: c.passingScore,
        phaseCount: c.phases.length, phaseTypes: c.phases.map(p => p.type),
        topic: { id: c.topic.id, title: c.topic.title, position: c.topic.position },
        course: { id: course.id, title: course.title, level: course.level } },
        progress: { passed: c.progress.length > 0, attemptCount: c.runs.length,
          bestScore: completed.length ? Math.max(...completed.map(r => publicPercentage(r.correctItems!, r.totalItems))) : null },
        activeRun: active ? { id: active.id, currentPhasePosition: active.phases.find(p => !p.submittedAt)?.position ?? null,
          completedPhases: active.phases.filter(p => p.submittedAt).length, totalPhases: active.phases.length } : null,
        access: node.access, progression: node.progression };
    });
  }
  start(id: string, userId: string, key: unknown) {
    const validatedKey = requestKey(key, 'INVALID_RUN_REQUEST_KEY');
    return this.repository.write(userId, async session => {
      const c = await this.visible(session, id, userId);
      // The original key identifies its run, even if another replay is active.
      const existing = await session.findKey(userId, id, validatedKey);
      if (existing?.status === 'ABANDONED') fail(409, 'UNIT_CHALLENGE_RUN_NOT_ACTIVE');
      if (existing) return { ...view(existing), run: { ...view(existing).run, resumed: true } };
      const active = await session.findActive(userId, id);
      if (active) return { ...view(active), run: { ...view(active).run, resumed: true } };
      const course = (await session.findCourse(c.topic.courseId, userId))!;
      if (!course.courseProgress.length) fail(409, 'COURSE_NOT_STARTED');
      const source = entitlementSource(course.id, await session.findEntitlements(userId), this.clock());
      const node = roadmapNodes(course, source).find(n => n.type === 'UNIT_CHALLENGE' && n.id === id)!;
      if (!node.progression.unlocked) fail(409, 'UNIT_CHALLENGE_PREREQUISITE_REQUIRED');
      if (!hasLessonAccess(c, source)) fail(403, 'UNIT_CHALLENGE_ACCESS_REQUIRED');
      let content;
      try { content = validateChallenge(c.phases, c.passingScore); }
      catch { fail(409, 'UNIT_CHALLENGE_HAS_NO_CONTENT'); }
      const run = await session.createRun({ userId, unitChallengeId: id, requestKey: validatedKey,
        passingScoreSnapshot: c.passingScore, totalItems: content.reduce((n, p) => n + totalItems(p), 0),
        phases: { create: c.phases.map((p, i) => ({ sourcePhaseId: p.id, position: p.position, type: p.type,
          contentSnapshot: content[i]!.config, totalItems: totalItems(content[i]!) })) } });
      return { ...view(run), run: { ...view(run).run, resumed: false } };
    });
  }
  resume(id: string, runId: string, userId: string) {
    return this.repository.read(async session => view(await this.owned(session, id, runId, userId)));
  }
  abandon(id: string, runId: string, userId: string) {
    return this.repository.write(userId, async session => {
      const run = await this.owned(session, id, runId, userId);
      await session.lockRun(run.id);
      if (run.status === 'COMPLETED') fail(409, 'UNIT_CHALLENGE_RUN_NOT_ACTIVE');
      if (run.status === 'ACTIVE') await session.updateRun(runId, { status: 'ABANDONED', abandonedAt: this.clock() });
      return { runId, status: 'ABANDONED' };
    });
  }
  submit(id: string, runId: string, phaseId: string, userId: string, key: unknown, answer: unknown) {
    const validatedKey = requestKey(key, 'INVALID_UNIT_CHALLENGE_REQUEST_KEY');
    return this.repository.write(userId, async session => {
      let run = await this.owned(session, id, runId, userId);
      await session.lockRun(run.id);
      const phase = run.phases.find(p => p.id === phaseId);
      if (!phase) fail(404, 'UNIT_CHALLENGE_PHASE_NOT_FOUND');
      await session.lockPhase(phase.id);
      const checked = scoreAnswer(validateContent(phase.type, phase.contentSnapshot), answer);
      const keyed = run.phases.find(p => p.submissionRequestKey === validatedKey);
      if (keyed) {
        if (keyed.id !== phase.id || keyed.submissionRequestHash !== checked.hash) fail(409, 'UNIT_CHALLENGE_SUBMISSION_CONFLICT');
        // Stored within the original transaction, not rebuilt from later progression.
        return keyed.submissionResponse!;
      }
      if (phase.submittedAt) fail(409, 'UNIT_CHALLENGE_PHASE_ALREADY_SUBMITTED');
      if (run.status !== 'ACTIVE') fail(409, 'UNIT_CHALLENGE_RUN_NOT_ACTIVE');
      if (run.phases.find(p => !p.submittedAt)?.id !== phaseId) fail(409, 'UNIT_CHALLENGE_PHASE_NOT_AVAILABLE');
      const now = this.clock();
      await session.updatePhase(phaseId, { answerData: checked.answerData, correctItems: checked.correctItems,
        submissionRequestKey: validatedKey, submissionRequestHash: checked.hash, submittedAt: now });
      const final = run.phases.filter(p => !p.submittedAt).length === 1;
      if (final) {
        const correctItems = run.phases.reduce((n, p) => n + (p.id === phaseId ? checked.correctItems : p.correctItems!), 0);
        const passed = run.passingScoreSnapshot === null || correctItems * 100 >= run.passingScoreSnapshot * run.totalItems;
        run = await session.updateRun(run.id, { status: 'COMPLETED', completedAt: now, correctItems, passed });
        if (passed) await session.pass(userId, id, run.id, now);
      } else run = await this.owned(session, id, runId, userId);
      let response: Prisma.InputJsonValue;
      if (final) {
        const course = (await session.findCourse(run.challenge.topic.courseId, userId))!;
        const progress = courseProgress(course);
        if (progress.status === 'COMPLETED') await session.completeCourse(userId, course.id, now);
        const source = entitlementSource(course.id, await session.findEntitlements(userId), now);
        const consolidated = await session.findProgress(userId, id);
        response = { run: { id: run.id, status: run.status }, challenge: { id, title: run.challenge.title },
          topic: { id: run.challenge.topic.id, title: run.challenge.topic.title, completed: consolidated !== null },
          result: view(run).result!, courseProgress: progress, nextNode: nextNode(course, source) };
      } else response = { ...view(run), submittedPhase: { id: phase.id, type: phase.type } };
      await session.updatePhase(phaseId, { submissionResponse: response });
      return response;
    });
  }
}
