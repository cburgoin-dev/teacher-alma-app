// Run from backend with its existing tsx runtime; not imported by the mobile bundle.
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { demoId } from '../../backend/scripts/courses-demo-data.ts';
import { lessonsDemoData } from '../../backend/scripts/lessons-demo-data.ts';
import { LessonService } from '../../backend/src/modules/lessons/lesson.service.ts';
import { PrismaLessonRepository } from '../../backend/src/modules/lessons/lesson.repository.ts';
import { CourseService } from '../../backend/src/modules/courses/course.service.ts';
import { PrismaCourseRepository } from '../../backend/src/modules/courses/course.repository.ts';
import { PrismaReviewRepository } from '../../backend/src/modules/review/review.repository.ts';
import { ReviewService } from '../../backend/src/modules/review/review.service.ts';
import { configuredReviewToken } from '../../backend/src/modules/review/review.token.ts';

// Resolve tooling dependencies from backend, without adding them to Mobile.
createRequire(new URL('../../backend/package.json', import.meta.url))('dotenv').config({ quiet: true });

async function main() {
  if (!process.argv.includes('--prepare')) throw new Error('Use --prepare. This completes unfinished demo lessons with incorrect answers; it does not reset learning.');
  const backend = fileURLToPath(new URL('../../backend/', import.meta.url));
  const baseline = process.argv.includes('--baseline');
  // Existing seed validates development mode, local DB, user and fixture collisions.
  for (const action of ['--check', '--apply']) {
    const seeded = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/seed-courses-demo.ts', action], { cwd: backend, encoding: 'utf8' });
    if (seeded.status !== 0) throw new Error('Guarded demo seed failed. Check the existing local demo configuration.');
  }
  if (baseline) {
    const reset = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/seed-courses-demo.ts', '--reset', '--lessons'], { cwd: backend, encoding: 'utf8' });
    if (reset.status !== 0) throw new Error('Guarded baseline reset failed.');
  }
  const { prisma } = await import('../../backend/src/shared/prisma.ts');
  try {
    const userId = process.env.DEV_AUTH_USER_ID;
    const courses = new CourseService(new PrismaCourseRepository(prisma));
    const lessons = new LessonService(new PrismaLessonRepository(prisma));
    const definitions = lessonsDemoData().activities;
    await courses.start(demoId(1), userId);
    for (const id of [demoId(1003), demoId(1004)]) {
      const data = await lessons.read(id, userId);
      if (data.state.status === 'COMPLETED') continue;
      const run = await lessons.start(id, userId, randomUUID());
      for (const step of data.steps) {
        if (step.type === 'SUMMARY_STEP') continue;
        if (step.type !== 'ACTIVITY_STEP') await lessons.completeStep(id, run.runId, step.id, userId);
        else {
          const activity = step.blocks[0].activity;
          const config = definitions.find(a => a.id === activity.id).config;
          const answer = 'options' in activity ? { selectedOptionId: activity.options.find(o => o.id !== config.correctOptionId).id }
            : activity.type === 'FILL_BLANK_TEXT' ? { text: '__demo_incorrect__' }
              : { pairs: config.pairs.map((pair, i) => ({ wordId: pair.wordId, imageId: config.pairs[(i + 1) % config.pairs.length].imageId })) };
          await lessons.attempt(id, run.runId, step.id, userId, answer);
        }
      }
      await lessons.complete(id, run.runId, userId);
    }
    const review = new ReviewService(new PrismaReviewRepository(prisma), configuredReviewToken());
    const summary = await review.read(userId);
    console.log(JSON.stringify({ state: summary.state, pendingCount: summary.pendingCount, groups: summary.groups }));
    if (baseline) {
      // Review was created by real completion above; restore only the demo Lesson baseline.
      const reset = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/seed-courses-demo.ts', '--reset', '--lessons', '--keep-review'], { cwd: backend, encoding: 'utf8' });
      if (reset.status !== 0) throw new Error('Could not restore the Lesson baseline.');
      console.log('A1 2/8, Lesson 3 current, Lesson 4 incomplete, A2 unstarted, no ACTIVE runs; Review remains ready.');
    }
    console.log('Open DEV · Abrir Review from mobile Home. See mobile/REVIEW.md for the reproducible baseline.');
  } finally { await prisma.$disconnect(); }
}
main().catch(() => { console.error('Could not finish preparing Review. Check the local demo database and LAN; preparation may have partially completed.'); process.exitCode = 1; });
