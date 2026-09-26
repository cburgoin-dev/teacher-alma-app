import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Client } from 'pg';

test('Review migration merges duplicate lifecycles without losing attempts or Lesson uniqueness', { skip: process.env.RUN_REVIEW_DB_TESTS !== '1' }, async () => {
  await import('dotenv/config');
  const target = new URL(process.env.DATABASE_URL ?? '');
  assert.ok(process.env.NODE_ENV === 'development' && ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
    && target.port === '5433' && target.pathname === '/teacher_alma_dev');
  const schema = 'review_migration_test_' + randomUUID().replaceAll('-', '');
  assert.match(schema, /^review_migration_test_[a-f0-9]{32}$/);
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    await db.query('CREATE SCHEMA "' + schema + '"');
    await db.query('SET search_path TO "' + schema + '"');
    const sql = (name: string) => readFile(new URL('../../../prisma/migrations/' + name + '/migration.sql', import.meta.url), 'utf8');
    await db.query((await sql('20260914000000_init')).replace('CREATE SCHEMA IF NOT EXISTS "public";', ''));
    await db.query(await sql('20260925000000_lesson_runs'));
    const user = randomUUID(), activity = randomUUID(), resolvedOnly = randomUUID();
    await db.query('INSERT INTO users(id,email) VALUES ($1,$2)', [user, 'review-migration@example.invalid']);
    for (const id of [activity, resolvedOnly]) await db.query("INSERT INTO activities(id,type,prompt,config) VALUES ($1,'MULTIPLE_CHOICE','Test','{}')", [id]);
    const ids = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
    for (const [i, id] of ids.entries()) {
      await db.query("INSERT INTO review_items(id,user_id,activity_id,status,incorrect_attempts,created_at,last_reviewed_at,resolved_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
        [id, user, i < 2 ? activity : resolvedOnly, i === 1 ? 'ACTIVE' : 'RESOLVED', i + 1, new Date(1000 + i), new Date(5000 + i), i === 1 ? null : new Date(6000 + i)]);
      await db.query("INSERT INTO activity_attempts(id,user_id,activity_id,review_item_id,context,answer_data,is_correct,attempt_number,created_at) VALUES ($1,$2,$3,$4,'REVIEW','{}',true,1,$5)",
        [randomUUID(), user, i < 2 ? activity : resolvedOnly, id, new Date(1000 + i)]);
      await db.query("INSERT INTO activity_attempts(id,user_id,activity_id,review_item_id,context,answer_data,is_correct) VALUES ($1,$2,$3,$4,'LESSON','{}',false)", [randomUUID(), user, i < 2 ? activity : resolvedOnly, id]);
    }
    await db.query(await sql('20260926000000_review_v1'));
    const items = (await db.query('SELECT * FROM review_items ORDER BY created_at')).rows;
    assert.equal(items.length, 2);
    assert.equal(items[0].id, ids[0]); assert.equal(items[0].status, 'ACTIVE'); assert.equal(items[0].incorrect_attempts, 3);
    assert.equal(items[0].resolved_at, null); assert.equal(items[0].last_reviewed_at.getTime(), 5001);
    assert.equal(items[1].id, ids[2]); assert.equal(items[1].status, 'RESOLVED'); assert.equal(items[1].incorrect_attempts, 7);
    assert.equal(items[1].resolved_at.getTime(), 6003);
    assert.equal((await db.query('SELECT * FROM activity_attempts')).rowCount, 8);
    for (const id of [ids[0], ids[2]]) {
      assert.equal((await db.query('SELECT * FROM activity_attempts WHERE review_item_id=$1', [id])).rowCount, 4);
      assert.deepEqual((await db.query("SELECT attempt_number FROM activity_attempts WHERE review_item_id=$1 AND context='REVIEW' ORDER BY attempt_number", [id])).rows, [{ attempt_number: 1 }, { attempt_number: 2 }]);
    }
    await assert.rejects(db.query("INSERT INTO review_items(id,user_id,activity_id,status) VALUES ($1,$2,$3,'RESOLVED')", [randomUUID(), user, activity]), /unique constraint/);
    const indexes = (await db.query('SELECT indexdef FROM pg_indexes WHERE schemaname=$1', [schema])).rows.map(r => r.indexdef).join('\n');
    assert.match(indexes, /UNIQUE.*\(run_id, activity_id, attempt_number\)/);
    assert.match(indexes, /UNIQUE.*\(user_id, review_request_key\)/);
    const beforeBatchMigration = (await db.query('SELECT * FROM activity_attempts ORDER BY id')).rows;
    await db.query(await sql('20260926010000_review_batch_submission'));
    const afterBatchMigration = (await db.query('SELECT * FROM activity_attempts ORDER BY id')).rows;
    assert.deepEqual(afterBatchMigration.map(({ review_batch_id, ...attempt }) => {
      assert.equal(review_batch_id, null); return attempt;
    }), beforeBatchMigration);
    const batchIndex = (await db.query("SELECT indexdef FROM pg_indexes WHERE schemaname=$1 AND indexname='activity_attempts_review_item_id_review_batch_id_key'", [schema])).rows[0];
    assert.match(batchIndex.indexdef, /UNIQUE.*\(review_item_id, review_batch_id\)/);
  } finally {
    await db.query('ROLLBACK');
    await db.query('SET search_path TO public');
    await db.query('DROP SCHEMA IF EXISTS "' + schema + '" CASCADE');
    await db.end();
  }
});
