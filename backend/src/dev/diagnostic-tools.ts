import { randomUUID } from 'node:crypto';
import { Router, type RequestHandler } from 'express';
import type { PrismaClient } from '../generated/prisma/client.js';
import { HttpError } from '../shared/http-error.js';
import { DiagnosticService } from '../modules/diagnostics/diagnostic.service.js';
import { DiagnosticSession } from '../modules/diagnostics/diagnostic.repository.js';
import { availableDiagnostic } from '../modules/diagnostics/diagnostic.availability.js';
import { HomeService } from '../modules/home/home.service.js';
import { PrismaHomeRepository } from '../modules/home/home.repository.js';
import { diagnosticDevEnabled, diagnosticDevUserId as userId } from './diagnostic-gate.js';

export class DiagnosticDevTools {
  constructor(private db: PrismaClient) {}
  async status() {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user) return { userId, scenario: 'SIN_PREPARAR', home: null };
    if (user.email !== 'diagnostic-dev@example.test') throw new HttpError(409, 'DEV_IDENTITY_CONFLICT', 'La identidad reservada pertenece a otro usuario');
    const home = await new HomeService(new PrismaHomeRepository(this.db)).read(userId);
    const active = await this.db.diagnosticAttempt.count({ where: { userId, status: 'ACTIVE' } });
    return { userId, scenario: active ? 'ACTIVE' : home.hero.type === 'ASSESSED'
      ? `ASSESSED ${home.hero.diagnostic.recommendedLevel}` : home.state, home };
  }
  async prepare(action: unknown) {
    if (typeof action !== 'string' || !['NEW', 'ASSESSED_A1', 'ASSESSED_A2', 'CLEAR_ACTIVE'].includes(action)) throw new HttpError(400, 'INVALID_DEV_ACTION', 'Acción DEV desconocida');
    await this.db.$transaction(async tx => {
      const email = 'diagnostic-dev@example.test';
      const user = await tx.user.upsert({ where: { id: userId }, create: { id: userId, email, displayName: 'Diagnostic DEV' }, update: {} });
      if (user.email !== email) throw new HttpError(409, 'DEV_IDENTITY_CONFLICT', 'La identidad reservada pertenece a otro usuario');
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
      const session = new DiagnosticSession(tx);
      if (action === 'CLEAR_ACTIVE') { await session.abandonActive(userId, new Date()); return; }
      await session.lockPublication();
      const definition = await availableDiagnostic(session);
      const questionIds = [81201, 81202, 81203, 81204].map(n => `6ac0de00-0000-4000-8000-${String(n).padStart(12, '0')}`);
      const types = ['MULTIPLE_CHOICE', 'FILL_BLANK_OPTIONS', 'FILL_BLANK_TEXT', 'MATCH_WORD_IMAGE'];
      if (!definition || definition.id !== '6ac0de00-0000-4000-8000-000000081000'
        || definition.diagnosticQuestions.length !== 4
        || definition.diagnosticQuestions.some((q, i) => q.id !== questionIds[i] || q.activity.type !== types[i])) {
        throw new HttpError(409, 'DIAGNOSTIC_DEV_CONTENT_REQUIRED', 'Falta el Diagnostic demo A1/A2 publicado con sus cuatro Activities y cursos con contenido. No se modificó el escenario.');
      }
      // Dedicated acceptance learner only; shared content and other learning domains are untouched.
      await tx.diagnosticAttempt.deleteMany({ where: { userId } });
      await tx.courseProgress.deleteMany({ where: { userId } });
      if (action === 'NEW') return;
      // Reuse real validation, evaluation, scoring, receipts and completion atomically.
      const service = new DiagnosticService({ read: work => work(session), write: (_id, work) => work(session) });
      const started = await service.start(userId, randomUUID());
      const answers = [{ selectedOptionId: action === 'ASSESSED_A1' ? 'name' : 'coffee' }, { selectedOptionId: 'at' }, { text: 'visited' },
        { pairs: [{ wordId: 'read', imageId: 'book-image' }, { wordId: 'play', imageId: 'ball-image' }, { wordId: 'drink', imageId: 'cup-image' }] }];
      for (let i = 0; i < questionIds.length; i++) await service.submit(userId, started.attempt.id, questionIds[i]!, randomUUID(), answers[i]);
      const result = (await service.result(userId)).result;
      if (result.recommendedLevel !== (action === 'ASSESSED_A1' ? 'A1' : 'A2')) throw new HttpError(409, 'DEV_RESULT_MISMATCH', 'El contenido no produce el resultado esperado; no se guardaron cambios');
    }, { timeout: 15000 });
    return this.status();
  }
}

export function diagnosticDevTools(db: PrismaClient, environment: string | undefined, databaseUrl: string | undefined) {
  const enabled = diagnosticDevEnabled(environment, databaseUrl);
  const service = new DiagnosticDevTools(db), router = Router();
  router.use((_req, _res, next) => next(enabled ? undefined : new HttpError(404, 'NOT_FOUND', 'Not found')));
  router.get('/', async (_req, res) => { res.json(await service.status()); });
  router.post('/', async (req, res) => {
    if (!req.body || Object.keys(req.body).some(key => key !== 'action')) throw new HttpError(400, 'INVALID_DEV_ACTION', 'Sólo se admite action');
    res.json(await service.prepare(req.body.action));
  });
  const selectIdentity: RequestHandler = async (req, _res, next) => {
    const selected = req.header('X-Teacher-Alma-Dev-Learner');
    if (!selected) { next(); return; }
    if (!enabled || selected !== 'diagnostic-dev') { next(new HttpError(403, 'DEV_IDENTITY_DISABLED', 'Identidad DEV no disponible')); return; }
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || user.email !== 'diagnostic-dev@example.test') { next(new HttpError(409, 'DEV_LEARNER_NOT_PREPARED', 'Prepara primero un escenario DEV')); return; }
    req.auth = { userId }; next();
  };
  return { router, selectIdentity };
}
