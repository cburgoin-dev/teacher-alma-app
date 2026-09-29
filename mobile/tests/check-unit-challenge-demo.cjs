// Run from backend with its tsx loader; exercises Mobile's client/flow against
// real HTTP + PostgreSQL using seeded content and a disposable learner only.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
async function main() {
  await import('../../backend/node_modules/dotenv/config.js');
  const target = new URL(process.env.DATABASE_URL || '');
  assert.ok(process.env.NODE_ENV === 'development' && ['localhost', '127.0.0.1'].includes(target.hostname) && target.port === '5433' && target.pathname === '/teacher_alma_dev');
  const { prisma } = await import('../../backend/src/shared/prisma.ts');
  const { createApp } = await import('../../backend/src/shared/app.ts');
  const { CourseService } = await import('../../backend/src/modules/courses/course.service.ts');
  const { PrismaCourseRepository } = await import('../../backend/src/modules/courses/course.repository.ts');
  const { UnitChallengeService } = await import('../../backend/src/modules/unit-challenges/unit-challenge.service.ts');
  const { PrismaUnitChallengeRepository } = await import('../../backend/src/modules/unit-challenges/unit-challenge.repository.ts');
  const { ChallengeFlow } = require('../src/features/unit-challenges/flow.ts');
  const { challengeApi } = require('../src/features/unit-challenges/api.ts');
  const { coursesApi } = require('../src/features/courses/api/courses.ts');
  const challengeId = '6ac0de00-0000-4000-8000-000000050101';
  const courseId = '6ac0de00-0000-4000-8000-000000000001';
  const userId = randomUUID(); let server;
  const check = flow => { assert.equal(flow.snapshot().error, undefined); return flow.snapshot(); };
  try {
    const challenge = await prisma.unitChallenge.findUniqueOrThrow({ where: { id: challengeId }, include: { topic: { include: { lessons: true } } } });
    await prisma.user.create({ data: { id: userId, email: `${userId}@mobile-challenge-test.invalid` } });
    await prisma.courseProgress.create({ data: { userId, courseId, status: 'IN_PROGRESS' } });
    await prisma.lessonProgress.createMany({ data: challenge.topic.lessons.filter(l => l.isRequired && l.status === 'PUBLISHED').map(l => ({ userId, lessonId: l.id, status: 'COMPLETED', completedAt: new Date() })) });
    server = createApp(new CourseService(new PrismaCourseRepository(prisma)), (req, _res, next) => { req.auth = { userId }; next(); }, undefined, undefined, new UnitChallengeService(new PrismaUnitChallengeRepository(prisma))).listen(0, '127.0.0.1');
    await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
    process.env.EXPO_PUBLIC_API_URL = `http://127.0.0.1:${server.address().port}`;
    const before = await coursesApi.roadmap(courseId);
    assert.deepEqual(before.currentNode, { type: 'UNIT_CHALLENGE', id: challengeId });
    const flow = new ChallengeFlow(challengeId); await flow.load(); check(flow);
    assert.equal(flow.snapshot().response, undefined);
    await flow.start(); assert.equal(check(flow).response.phase.type, 'CONVERSATION');
    const runId = flow.snapshot().response.run.id;
    await flow.submit({ choices: [] }); assert.equal(check(flow).response.phase.type, 'CROSSWORD');
    flow.dispose();
    const resumed = new ChallengeFlow(challengeId); await resumed.load();
    assert.equal(check(resumed).response.run.id, runId); assert.equal(resumed.snapshot().response.phase.type, 'CROSSWORD');
    await resumed.submit({ entries: [] });
    const result = check(resumed).response.result;
    assert.equal(result.correctItems, 0); assert.equal(result.percentage, 0);
    assert.equal(result.passed, result.passingScore === null || result.passingScore === 0);
    assert.deepEqual((await challengeApi.run(challengeId, runId)).result, result);
    const after = await coursesApi.roadmap(courseId);
    assert.equal(after.progress.completedUnitChallenges, result.passed ? 1 : 0);
    assert.equal(after.currentNode?.id === challengeId, !result.passed);
    const replay = new ChallengeFlow(challengeId); await replay.load(); await replay.start();
    assert.notEqual(check(replay).response.run.id, runId); assert.equal(replay.snapshot().response.phase.type, 'CONVERSATION');
    await replay.abandon(); assert.equal(check(replay).exited, true);
    assert.equal((await challengeApi.metadata(challengeId)).activeRun, null);
    console.log('PASS: Mobile client/flow -> real demo HTTP/PostgreSQL: Roadmap, metadata, start, Conversation, resume Crossword, Result, historical GET, Roadmap progression, replay and abandon.');
  } finally {
    if (server) await new Promise((resolve, reject) => { server.close(e => e ? reject(e) : resolve()); server.closeAllConnections(); });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
