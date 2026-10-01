import { GamificationSession } from '../gamification/gamification.repository.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { PrismaCourseRepository } from '../courses/course.repository.js';

const runInclude = { phases: { orderBy: { position: 'asc' as const } },
  challenge: { include: { topic: true } } } satisfies Prisma.UnitChallengeRunInclude;
export class UnitChallengeSession {
  constructor(private readonly db: Prisma.TransactionClient) {}
  gamification() { return new GamificationSession(this.db); }
  completedRuns(userId: string, unitChallengeId: string) {
    return this.db.unitChallengeRun.count({ where: { userId, unitChallengeId, status: 'COMPLETED' } });
  }
  findChallenge(id: string, userId: string) {
    return this.db.unitChallenge.findUnique({ where: { id }, include: {
      phases: { orderBy: { position: 'asc' } }, progress: { where: { userId } },
      topic: { include: { course: true } },
      runs: { where: { userId }, include: { phases: { orderBy: { position: 'asc' } } } },
    } });
  }
  findCourse(id: string, userId: string) { return new PrismaCourseRepository(this.db).findCourse(id, userId); }
  findEntitlements(userId: string) { return new PrismaCourseRepository(this.db).findEntitlements(userId); }
  findRun(id: string, unitChallengeId: string, userId: string) {
    return this.db.unitChallengeRun.findFirst({ where: { id, unitChallengeId, userId }, include: runInclude });
  }
  findKey(userId: string, unitChallengeId: string, requestKey: string) {
    return this.db.unitChallengeRun.findUnique({ where: { userId_unitChallengeId_requestKey: { userId, unitChallengeId, requestKey } }, include: runInclude });
  }
  findActive(userId: string, unitChallengeId: string) {
    return this.db.unitChallengeRun.findFirst({ where: { userId, unitChallengeId, status: 'ACTIVE' }, include: runInclude });
  }
  createRun(data: Prisma.UnitChallengeRunUncheckedCreateInput) {
    return this.db.unitChallengeRun.create({ data, include: runInclude });
  }
  updateRun(id: string, data: Prisma.UnitChallengeRunUpdateInput) {
    return this.db.unitChallengeRun.update({ where: { id }, data, include: runInclude });
  }
  updatePhase(id: string, data: Prisma.UnitChallengeRunPhaseUpdateInput) {
    return this.db.unitChallengeRunPhase.update({ where: { id }, data });
  }
  async lockRun(id: string) {
    await this.db.$queryRaw`SELECT id FROM unit_challenge_runs WHERE id = ${id}::uuid FOR UPDATE`;
  }
  async lockPhase(id: string) {
    await this.db.$queryRaw`SELECT id FROM unit_challenge_run_phases WHERE id = ${id}::uuid FOR UPDATE`;
  }
  pass(userId: string, unitChallengeId: string, passedRunId: string, now: Date) {
    return this.db.unitChallengeProgress.createMany({ data: [{ userId, unitChallengeId, passedRunId, completedAt: now }], skipDuplicates: true });
  }
  findProgress(userId: string, unitChallengeId: string) {
    return this.db.unitChallengeProgress.findUnique({ where: { userId_unitChallengeId: { userId, unitChallengeId } }, select: { id: true } });
  }
  async completeCourse(userId: string, courseId: string, now: Date) {
    return this.db.courseProgress.updateMany({ where: { userId, courseId, status: { not: 'COMPLETED' } },
      data: { status: 'COMPLETED', completedAt: now } });
  }
}
export type ChallengeRun = NonNullable<Awaited<ReturnType<UnitChallengeSession['findRun']>>>;
export type ChallengePhase = ChallengeRun['phases'][number];

export class PrismaUnitChallengeRepository {
  constructor(private readonly db: PrismaClient) {}
  read<T>(work: (session: UnitChallengeSession) => Promise<T>): Promise<T> {
    return this.db.$transaction(async tx => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      return work(new UnitChallengeSession(tx));
    }, { isolationLevel: 'RepeatableRead' });
  }
  write<T>(userId: string, work: (session: UnitChallengeSession) => Promise<T>): Promise<T> {
    return this.db.$transaction(async tx => {
      // Same lock/order as Lessons and Review, including cross-feature course completion.
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
      return work(new UnitChallengeSession(tx));
    }, { isolationLevel: 'ReadCommitted', timeout: 15000 });
  }
}
