import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaCourseRepository } from './course.repository.js';

type Database = ConstructorParameters<typeof PrismaCourseRepository>[0];

test('reads scope course progress, lesson progress and entitlements to the requested user', async () => {
  const requests: unknown[] = [];
  const db = {
    course: {
      findMany: async (args: unknown) => { requests.push(args); return []; },
      findUnique: async (args: unknown) => { requests.push(args); return null; },
    },
    entitlement: { findMany: async (args: unknown) => { requests.push(args); return []; } },
    courseProgress: new Proxy({}, { get: () => { throw new Error('Read attempted a progress write'); } }),
  } as unknown as Database;
  const repo = new PrismaCourseRepository(db);
  await repo.findCourses('user-a');
  await repo.findCourse('course-a', 'user-b');
  await repo.findEntitlements('user-b');
  for (const [index, userId] of ['user-a', 'user-b'].entries()) {
    const query = requests[index] as {
      select: { courseProgress: { where: unknown }; topics: { select: { lessons: { select: { lessonProgress: { where: unknown } } } } } };
    };
    assert.deepEqual(query.select.courseProgress.where, { userId });
    assert.deepEqual(query.select.topics.select.lessons.select.lessonProgress.where, { userId });
  }
  assert.deepEqual((requests[1] as { where: unknown }).where, { id: 'course-a' });
  assert.deepEqual((requests[2] as { where: unknown }).where, { userId: 'user-b' });
});

test('concurrent start persistence uses conflict skipping and never updates an existing completed row', async () => {
  const rows = new Map<string, { status: string }>();
  const key = (userId: string, courseId: string) => `${userId}/${courseId}`;
  const db = {
    courseProgress: {
      createMany: async (args: { data: { userId: string; courseId: string; status: string }[]; skipDuplicates: boolean }) => {
        assert.equal(args.skipDuplicates, true, 'Database uniqueness must handle concurrent inserts');
        for (const row of args.data) {
          const id = key(row.userId, row.courseId);
          if (!rows.has(id)) rows.set(id, { status: row.status });
        }
        return { count: 0 };
      },
      findUniqueOrThrow: async (args: { where: { userId_courseId: { userId: string; courseId: string } } }) => {
        const { userId, courseId } = args.where.userId_courseId;
        const row = rows.get(key(userId, courseId));
        assert.ok(row);
        return row;
      },
    },
  } as unknown as Pick<PrismaClient, 'course' | 'courseProgress' | 'entitlement'>;
  const repo = new PrismaCourseRepository(db);
  const results = await Promise.all(Array.from({ length: 8 }, () => repo.createProgressOnce('course-a', 'user-a')));
  assert.equal(rows.size, 1);
  assert.ok(results.every(r => r.status === 'IN_PROGRESS'));
  const completed = { status: 'COMPLETED' };
  rows.set(key('user-a', 'course-a'), completed);
  assert.equal(await repo.createProgressOnce('course-a', 'user-a'), completed);
  await repo.createProgressOnce('course-a', 'user-b');
  assert.equal(rows.size, 2, 'Different users retain independent progress');
});
