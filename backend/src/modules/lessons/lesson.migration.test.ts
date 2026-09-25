import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Client } from 'pg';

test('LessonRun migration preserves completed history and archives incomplete legacy traversal', { skip: process.env.RUN_LESSONS_DB_TESTS !== '1' }, async () => {
  await import('dotenv/config');
  const target = new URL(process.env.DATABASE_URL ?? '');
  assert.ok(process.env.NODE_ENV === 'development' && ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
    && target.port === '5433' && target.pathname === '/teacher_alma_dev');
  const schema = 'lesson_migration_test_' + randomUUID().replaceAll('-', '');
  assert.match(schema, /^lesson_migration_test_[a-f0-9]{32}$/);
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    await db.query(`CREATE SCHEMA "${schema}"`);
    // No public fallback: every table/index/FK belongs to this disposable test schema.
    await db.query(`SET search_path TO "${schema}"`);
    const initial = await readFile(new URL('../../../prisma/migrations/20260914000000_init/migration.sql', import.meta.url), 'utf8');
    await db.query(initial.replace('CREATE SCHEMA IF NOT EXISTS "public";', ''));
    const user = randomUUID(), course = randomUUID(), topic = randomUUID(), activity = randomUUID();
    await db.query('INSERT INTO users(id,email) VALUES ($1,$2)', [user, 'migration@example.invalid']);
    await db.query("INSERT INTO courses(id,title,slug,status,position) VALUES ($1,'Test','test','PUBLISHED',1)", [course]);
    await db.query("INSERT INTO topics(id,course_id,title,position) VALUES ($1,$2,'Test',1)", [topic, course]);
    await db.query("INSERT INTO activities(id,type,prompt,config) VALUES ($1,'MULTIPLE_CHOICE','Test','{}')", [activity]);
    const lessons = [randomUUID(), randomUUID()];
    for (const [index, lesson] of lessons.entries()) {
      const block = randomUUID();
      await db.query("INSERT INTO lessons(id,topic_id,title,position) VALUES ($1,$2,'Test',$3)", [lesson, topic, index + 1]);
      await db.query("INSERT INTO lesson_blocks(id,lesson_id,type,position,activity_id) VALUES ($1,$2,'ACTIVITY',1,$3)", [block, lesson, activity]);
      await db.query('INSERT INTO lesson_progress(id,user_id,lesson_id,status) VALUES ($1,$2,$3,$4)', [randomUUID(), user, lesson, index === 0 ? 'COMPLETED' : 'IN_PROGRESS']);
      await db.query("INSERT INTO lesson_block_progress(id,user_id,lesson_block_id,status) VALUES ($1,$2,$3,'COMPLETED')", [randomUUID(), user, block]);
      // Duplicate legacy numbering: migration must preserve chronological first answer.
      for (const [n, correct] of [false, true].entries()) {
        await db.query("INSERT INTO activity_attempts(id,user_id,activity_id,lesson_id,context,answer_data,is_correct,attempt_number,created_at) VALUES ($1,$2,$3,$4,'LESSON','{}',$5,1,$6)",
          [randomUUID(), user, activity, lesson, correct, new Date(2026, 0, 1, 0, 0, n)]);
      }
    }
    await db.query('INSERT INTO review_items(id,user_id,activity_id,source_lesson_id,incorrect_attempts) VALUES ($1,$2,$3,$4,7)', [randomUUID(), user, activity, lessons[1]]);
    const migration = await readFile(new URL('../../../prisma/migrations/20260925000000_lesson_runs/migration.sql', import.meta.url), 'utf8');
    await db.query(migration);
    const runs = (await db.query('SELECT * FROM lesson_runs ORDER BY lesson_id')).rows;
    assert.equal(runs.length, 2);
    const completed = runs.find(r => r.lesson_id === lessons[0]);
    const abandoned = runs.find(r => r.lesson_id === lessons[1]);
    assert.equal(completed.status, 'COMPLETED');
    assert.equal(completed.correct_answers, 0); assert.equal(completed.total_activities, 1);
    assert.equal(abandoned.status, 'ABANDONED'); assert.equal(abandoned.correct_answers, null);
    assert.ok(abandoned.abandoned_at);
    assert.equal((await db.query('SELECT * FROM lesson_progress')).rows[0].completed_run_id, completed.id);
    assert.equal((await db.query('SELECT * FROM lesson_progress')).rowCount, 1);
    assert.equal((await db.query('SELECT * FROM lesson_block_progress')).rowCount, 1);
    assert.equal((await db.query('SELECT * FROM lesson_run_block_progress')).rowCount, 2);
    for (const run of runs) {
      const attempts = (await db.query('SELECT attempt_number,is_correct FROM activity_attempts WHERE run_id=$1 ORDER BY attempt_number', [run.id])).rows;
      assert.deepEqual(attempts, [{ attempt_number: 1, is_correct: false }, { attempt_number: 2, is_correct: true }]);
    }
    assert.equal((await db.query('SELECT incorrect_attempts FROM review_items')).rows[0].incorrect_attempts, 7);
    await assert.rejects(db.query("INSERT INTO lesson_progress(id,user_id,lesson_id,status) VALUES ($1,$2,$3,'IN_PROGRESS')", [randomUUID(), user, lessons[1]]), /lesson_progress_durable_completed/);
  } finally {
    await db.query('ROLLBACK'); // Also clears an aborted transaction if migration failed.
    await db.query('SET search_path TO public');
    await db.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await db.end();
  }
});
