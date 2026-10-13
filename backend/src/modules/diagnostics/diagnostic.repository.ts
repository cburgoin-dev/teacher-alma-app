import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { PrismaCourseRepository } from '../courses/course.repository.js';

export const definitionInclude = { diagnosticQuestions: { orderBy: { position: 'asc' as const }, include: { activity: true } } } satisfies Prisma.DiagnosticInclude;
const attemptInclude = { diagnostic: { include: definitionInclude }, diagnosticAnswers: true } satisfies Prisma.DiagnosticAttemptInclude;
export type DiagnosticDefinition = Prisma.DiagnosticGetPayload<{ include: typeof definitionInclude }>;
export type DiagnosticRun = Prisma.DiagnosticAttemptGetPayload<{ include: typeof attemptInclude }>;
export class DiagnosticSession {
  constructor(private readonly db: Prisma.TransactionClient) {}
  courses() { return new PrismaCourseRepository(this.db); }
  published() { return this.db.diagnostic.findMany({ where: { status: 'PUBLISHED' }, include: definitionInclude }); }
  destinations() {
    return this.db.course.findMany({ where: { status: 'PUBLISHED' }, select: {
      id: true, level: true, position: true, status: true,
      topics: { select: { id: true, title: true, position: true,
        lessons: { select: { id: true, title: true, position: true, status: true, isRequired: true, accessType: true } },
        unitChallenge: { select: { id: true, title: true, status: true, accessType: true } },
      } },
    }, orderBy: [{ position: 'asc' }, { id: 'asc' }] });
  }
  findKey(userId: string, requestKey: string) { return this.db.diagnosticAttempt.findUnique({ where: { userId_requestKey: { userId, requestKey } }, include: attemptInclude }); }
  findAttempt(userId: string, id: string) { return this.db.diagnosticAttempt.findFirst({ where: { userId, id }, include: attemptInclude }); }
  latest(userId: string) { return this.db.diagnosticAttempt.findFirst({ where: { userId, status: 'COMPLETED' }, orderBy: [{ completedAt: 'desc' }, { startedAt: 'desc' }, { id: 'asc' }], include: attemptInclude }); }
  abandonActive(userId: string, now: Date) { return this.db.diagnosticAttempt.updateMany({ where: { userId, status: 'ACTIVE' }, data: { status: 'ABANDONED', abandonedAt: now } }); }
  create(data: Prisma.DiagnosticAttemptUncheckedCreateInput) { return this.db.diagnosticAttempt.create({ data, include: attemptInclude }); }
  update(id: string, data: Prisma.DiagnosticAttemptUncheckedUpdateInput) { return this.db.diagnosticAttempt.update({ where: { id }, data, include: attemptInclude }); }
  answer(data: Prisma.DiagnosticAnswerUncheckedCreateInput) { return this.db.diagnosticAnswer.create({ data }); }
  async lockAttempt(id: string, userId: string) {
    await this.db.$queryRaw`SELECT id FROM diagnostic_attempts WHERE id = ${id}::uuid AND user_id = ${userId}::uuid FOR UPDATE`;
  }
  async lockPublication() {
    // Shared table locks keep the current publication and catalog stable through start.
    // Publication/configuration writes use PostgreSQL's conflicting table lock.
    await this.db.$executeRaw`LOCK TABLE diagnostics, diagnostic_questions, activities, courses IN SHARE MODE`;
  }
}
export interface DiagnosticRepository {
  read<T>(work: (session: DiagnosticSession) => Promise<T>): Promise<T>;
  write<T>(userId: string, work: (session: DiagnosticSession) => Promise<T>): Promise<T>;
}
export class PrismaDiagnosticRepository implements DiagnosticRepository {
  constructor(private readonly db: PrismaClient) {}
  read<T>(work: (session: DiagnosticSession) => Promise<T>): Promise<T> {
    return this.db.$transaction(async tx => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      return work(new DiagnosticSession(tx));
    }, { isolationLevel: 'RepeatableRead' });
  }
  write<T>(userId: string, work: (session: DiagnosticSession) => Promise<T>): Promise<T> {
    return this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
      return work(new DiagnosticSession(tx));
    }, { isolationLevel: 'ReadCommitted', timeout: 15000 });
  }
}
