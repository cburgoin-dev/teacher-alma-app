import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { diagnosticDevEnabled, diagnosticDevUserId as userId } from './diagnostic-gate.js';
import { DiagnosticDevTools, diagnosticDevTools } from './diagnostic-tools.js';
import { createApp } from '../shared/app.js';
import { developmentAuth } from '../shared/auth.js';
import { CourseService } from '../modules/courses/course.service.js';
import { PrismaCourseRepository } from '../modules/courses/course.repository.js';
import { HomeService } from '../modules/home/home.service.js';
import { PrismaHomeRepository } from '../modules/home/home.repository.js';
import { DiagnosticService } from '../modules/diagnostics/diagnostic.service.js';
import { PrismaDiagnosticRepository } from '../modules/diagnostics/diagnostic.repository.js';

test('DEV gate permits only development and the named local database', () => {
  const local = 'postgresql://localhost:5433/teacher_alma_dev';
  assert.equal(diagnosticDevEnabled('development', local), true);
  for (const env of ['production', 'test', undefined]) assert.equal(diagnosticDevEnabled(env, local), false);
  for (const url of ['invalid', 'postgresql://remote/teacher_alma_dev', 'postgresql://localhost/production']) assert.equal(diagnosticDevEnabled('development', url), false);
});

test('DEV scenarios use real scoring, isolate the learner, roll back failures and enforce HTTP gating', { skip: process.env.RUN_DIAGNOSTIC_DB_TESTS !== '1' }, async () => {
  await import('dotenv/config');
  assert.ok(diagnosticDevEnabled(process.env.NODE_ENV, process.env.DATABASE_URL));
  const target = new URL(process.env.DATABASE_URL!);
  const schema = `diagnostic_dev_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new Client({ connectionString: target.toString() }); await admin.connect();
  await admin.query(`CREATE SCHEMA "${schema}"`); target.searchParams.set('options', `-c search_path=${schema}`);
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: target.toString() }, { schema }) });
  const service = new DiagnosticDevTools(db), diagnostic = new DiagnosticService(new PrismaDiagnosticRepository(db));
  const courses = new CourseService(new PrismaCourseRepository(db)), home = new HomeService(new PrismaHomeRepository(db));
  let server: ReturnType<ReturnType<typeof createApp>['listen']> | undefined;
  try {
    await admin.query(`SET search_path TO "${schema}"`);
    const root = new URL('../../prisma/migrations/', import.meta.url);
    for (const name of (await readdir(root)).filter(n => /^\d/.test(n)).sort()) await admin.query(await readFile(new URL(`${name}/migration.sql`, root), 'utf8'));
    const otherId = randomUUID(); await db.user.create({ data: { id: otherId, email: 'other@test.invalid' } });
    // Test fixture only; production source does not import seed scripts outside rootDir.
    const fixtureModule = '../../scripts/diagnostic-demo-data.js';
    const { diagnosticDemoData } = await import(fixtureModule);
    const demo = diagnosticDemoData();
    for (const level of ['A1', 'A2']) {
      const course = await db.course.create({ data: { title: level, slug: level, level, status: 'PUBLISHED', position: level === 'A1' ? 1 : 2 } });
      const topic = await db.topic.create({ data: { courseId: course.id, title: level, position: 1 } });
      await db.lesson.create({ data: { topicId: topic.id, title: level, position: 1, status: 'PUBLISHED' } });
      await db.courseProgress.create({ data: { userId: otherId, courseId: course.id, status: 'IN_PROGRESS' } });
    }
    await db.diagnostic.create({ data: { ...demo.diagnostic, status: 'DRAFT' } });
    await db.activity.createMany({ data: demo.activities }); await db.diagnosticQuestion.createMany({ data: demo.questions });
    await db.diagnostic.update({ where: { id: demo.diagnostic.id }, data: { status: 'PUBLISHED' } });
    const shared = async () => JSON.stringify(await Promise.all([db.course.findMany(), db.topic.findMany(), db.lesson.findMany(), db.activity.findMany(), db.diagnostic.findMany(), db.diagnosticQuestion.findMany()]));
    const before = await shared();
    await assert.rejects(service.prepare(['NEW']), { code: 'INVALID_DEV_ACTION' });
    const other = await diagnostic.start(otherId, randomUUID());
    assert.equal((await service.prepare('NEW')).scenario, 'NEW');
    assert.equal((await home.read(userId)).hero.type, 'NEW');
    const newHero = (await home.read(userId)).hero; assert.ok(newHero.type === 'NEW' && newHero.diagnosticAvailable);
    for (const level of ['A1', 'A2']) {
      assert.equal((await service.prepare(`ASSESSED_${level}`)).scenario, `ASSESSED ${level}`);
      assert.equal((await home.read(userId)).state, 'ASSESSED');
      assert.equal((await diagnostic.result(userId)).result.recommendedLevel, level);
      const completed = await db.diagnosticAttempt.findFirstOrThrow({ where: { userId, status: 'COMPLETED' } });
      assert.equal(await db.diagnosticAnswer.count({ where: { diagnosticAttemptId: completed.id } }), 4);
      const active = await diagnostic.start(userId, randomUUID());
      await service.prepare('CLEAR_ACTIVE');
      assert.equal((await db.diagnosticAttempt.findUniqueOrThrow({ where: { id: active.attempt.id } })).status, 'ABANDONED');
      assert.equal((await diagnostic.result(userId)).result.attemptId, completed.id);
    }
    const course = await db.course.findFirstOrThrow();
    await db.courseProgress.create({ data: { userId, courseId: course.id, status: 'IN_PROGRESS' } });
    await service.prepare('NEW');
    assert.equal(await db.courseProgress.count({ where: { userId } }), 0);
    assert.equal(await db.diagnosticAttempt.count({ where: { userId } }), 0);
    assert.equal(await db.courseProgress.count({ where: { userId: otherId } }), 2);
    assert.equal((await db.diagnosticAttempt.findUniqueOrThrow({ where: { id: other.attempt.id } })).status, 'ACTIVE');
    assert.equal(await shared(), before);
    for (const env of ['development', 'production', 'test']) {
      const tools = diagnosticDevTools(db, env, target.toString());
      const app = createApp(courses, developmentAuth(env, otherId), undefined, undefined, undefined, undefined, home, undefined, diagnostic, tools);
      server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server!.once('listening', resolve));
      const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      const response = await fetch(`${base}/dev/diagnostic`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'NEW' }) });
      assert.equal(response.status, env === 'development' ? 200 : 404);
      const selected = await fetch(`${base}/me/home`, { headers: { 'X-Teacher-Alma-Dev-Learner': 'diagnostic-dev' } });
      assert.equal(selected.status, env === 'development' ? 200 : 403);
      if (env === 'development') {
        assert.equal((await selected.json()).state, 'NEW');
        assert.equal((await (await fetch(`${base}/me/home`)).json()).state, 'ACTIVE');
        assert.equal((await fetch(`${base}/dev/diagnostic`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'NEW', userId: otherId }) })).status, 400);
        assert.equal((await fetch(`${base}/me/home`, { headers: { 'X-Teacher-Alma-Dev-Learner': otherId } })).status, 403);
      }
      await new Promise<void>(resolve => server!.close(() => resolve())); server = undefined;
    }
    await service.prepare('ASSESSED_A1');
    const historical = (await diagnostic.result(userId)).result.attemptId;
    await db.diagnostic.update({ where: { id: demo.diagnostic.id }, data: { status: 'ARCHIVED' } });
    await assert.rejects(service.prepare('NEW'), { code: 'DIAGNOSTIC_DEV_CONTENT_REQUIRED' });
    assert.equal((await diagnostic.result(userId)).result.attemptId, historical);
  } finally {
    if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
    await db.$disconnect(); await admin.query(`DROP SCHEMA "${schema}" CASCADE`); await admin.end();
  }
});
