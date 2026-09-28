import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Client } from 'pg';

test('Unit Challenge migration: additive schema, CHECKs, unique indexes, restrictive content history and cascade', {
  skip: process.env.RUN_UNIT_CHALLENGE_DB_TESTS !== '1',
}, async () => {
  await import('dotenv/config');
  const target = new URL(process.env.DATABASE_URL ?? '');
  assert.ok(process.env.NODE_ENV === 'development' && ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
    && target.port === '5433' && target.pathname === '/teacher_alma_dev');
  const schema = 'challenge_migration_test_' + randomUUID().replaceAll('-', '');
  assert.match(schema, /^challenge_migration_test_[a-f0-9]{32}$/);
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    await db.query('CREATE SCHEMA "' + schema + '"');
    await db.query('SET search_path TO "' + schema + '"');
    for (const name of ['20260914000000_init', '20260925000000_lesson_runs', '20260926000000_review_v1', '20260926010000_review_batch_submission']) {
      const sql = await readFile(new URL('../../../prisma/migrations/' + name + '/migration.sql', import.meta.url), 'utf8');
      await db.query(sql.replace('CREATE SCHEMA IF NOT EXISTS "public";', ''));
    }
    const user = randomUUID(), course = randomUUID(), topic = randomUUID(), challenge = randomUUID(), phase = randomUUID(), run = randomUUID();
    await db.query('INSERT INTO users(id,email) VALUES ($1,$2)', [user, user + '@test.invalid']);
    await db.query("INSERT INTO courses(id,title,slug,status,position) VALUES ($1,'Test','test','PUBLISHED',1)", [course]);
    await db.query("INSERT INTO topics(id,course_id,title,position) VALUES ($1,$2,'Test',1)", [topic, course]);
    await db.query(await readFile(new URL('../../../prisma/migrations/20260928000000_unit_challenge_v1/migration.sql', import.meta.url), 'utf8'));
    assert.equal((await db.query('SELECT * FROM topics')).rowCount, 1);
    assert.equal((await db.query("SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name='topics' AND column_name='status'", [schema])).rowCount, 0);
    await db.query("INSERT INTO unit_challenges(id,topic_id,title) VALUES ($1,$2,'Test')", [challenge, topic]);
    await assert.rejects(db.query("INSERT INTO unit_challenges(id,topic_id,title) VALUES ($1,$2,'Test')", [randomUUID(), topic]), /unique/);
    for (const score of [-1, 101]) await assert.rejects(db.query('UPDATE unit_challenges SET passing_score=$1', [score]), /unit_challenges_threshold/);
    await assert.rejects(db.query("UPDATE unit_challenges SET status='INVALID'"), /unit_challenges_status/);
    await assert.rejects(db.query("UPDATE unit_challenges SET access_type='SUBSCRIPTION'"), /unit_challenges_access/);
    await db.query("INSERT INTO unit_challenge_phases(id,unit_challenge_id,type,position,config) VALUES ($1,$2,'CROSSWORD',1,'{}')", [phase, challenge]);
    await assert.rejects(db.query("UPDATE unit_challenge_phases SET type='ACTIVITY'"), /unit_challenge_phases_type/);
    await assert.rejects(db.query('UPDATE unit_challenge_phases SET position=0'), /unit_challenge_phases_position/);
    await db.query("INSERT INTO unit_challenge_runs(id,user_id,unit_challenge_id,request_key,total_items) VALUES ($1,$2,$3,'original-request',1)", [run, user, challenge]);
    await assert.rejects(db.query("INSERT INTO unit_challenge_runs(id,user_id,unit_challenge_id,request_key,total_items) VALUES ($1,$2,$3,'second-request',1)", [randomUUID(), user, challenge]), /unit_challenge_runs_one_active/);
    for (const sql of ["status='COMPLETED'", "status='ABANDONED'", "status='UNKNOWN'", 'correct_items=0', 'total_items=0', 'passing_score_snapshot=101']) {
      await assert.rejects(db.query('UPDATE unit_challenge_runs SET ' + sql), /check constraint/);
    }
    const rp = randomUUID();
    await db.query("INSERT INTO unit_challenge_run_phases(id,run_id,source_phase_id,position,type,content_snapshot,total_items) VALUES ($1,$2,$3,1,'CROSSWORD','{}',1)", [rp, run, phase]);
    await assert.rejects(db.query("UPDATE unit_challenge_run_phases SET submitted_at=now()"), /unit_challenge_run_phases_submission/);
    await assert.rejects(db.query('DELETE FROM unit_challenge_phases'), /foreign key/);
    await assert.rejects(db.query('DELETE FROM unit_challenges'), /foreign key/);
    await assert.rejects(db.query('DELETE FROM topics'), /foreign key/);
    await db.query("UPDATE unit_challenge_run_phases SET submitted_at=now(),answer_data='{}',correct_items=1,submission_request_key='phase-key',submission_request_hash='hash',submission_response='{}'");
    await db.query("UPDATE unit_challenge_runs SET status='COMPLETED',completed_at=now(),correct_items=1,passed=true");
    await db.query('INSERT INTO unit_challenge_progress(id,user_id,unit_challenge_id,passed_run_id) VALUES ($1,$2,$3,$4)', [randomUUID(), user, challenge, run]);
    await assert.rejects(db.query('DELETE FROM unit_challenge_runs'), /foreign key/);
    await assert.rejects(db.query("INSERT INTO unit_challenge_runs(id,user_id,unit_challenge_id,request_key,total_items) VALUES ($1,$2,$3,'original-request',1)", [randomUUID(), user, challenge]), /unique/);
    await db.query('DELETE FROM users WHERE id=$1', [user]);
    for (const table of ['unit_challenge_runs', 'unit_challenge_run_phases', 'unit_challenge_progress']) assert.equal((await db.query('SELECT * FROM ' + table)).rowCount, 0);
  } finally {
    await db.query('ROLLBACK');
    await db.query('SET search_path TO public');
    await db.query('DROP SCHEMA IF EXISTS "' + schema + '" CASCADE');
    await db.end();
  }
});
