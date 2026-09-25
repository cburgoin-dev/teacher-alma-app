BEGIN;
CREATE TABLE lesson_runs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  request_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  current_block_id UUID REFERENCES lesson_blocks(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  started_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ(6), abandoned_at TIMESTAMPTZ(6),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  correct_answers INTEGER, total_activities INTEGER,
  CONSTRAINT lesson_runs_lifecycle CHECK (
    (status = 'ACTIVE' AND completed_at IS NULL AND abandoned_at IS NULL AND correct_answers IS NULL AND total_activities IS NULL) OR
    (status = 'COMPLETED' AND completed_at IS NOT NULL AND abandoned_at IS NULL AND current_block_id IS NULL AND correct_answers IS NOT NULL AND total_activities IS NOT NULL) OR
    (status = 'ABANDONED' AND completed_at IS NULL AND abandoned_at IS NOT NULL AND current_block_id IS NULL AND correct_answers IS NULL AND total_activities IS NULL)),
  CONSTRAINT lesson_runs_score CHECK (correct_answers >= 0 AND total_activities >= correct_answers)
);
CREATE UNIQUE INDEX lesson_runs_user_id_lesson_id_request_key_key ON lesson_runs(user_id, lesson_id, request_key);
CREATE UNIQUE INDEX lesson_runs_one_active ON lesson_runs(user_id, lesson_id) WHERE status = 'ACTIVE';
CREATE INDEX lesson_runs_lesson_id_idx ON lesson_runs(lesson_id);
CREATE INDEX lesson_runs_current_block_id_idx ON lesson_runs(current_block_id);
CREATE TABLE lesson_run_block_progress (
  run_id UUID NOT NULL REFERENCES lesson_runs(id) ON DELETE CASCADE ON UPDATE CASCADE,
  lesson_block_id UUID NOT NULL REFERENCES lesson_blocks(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  completed_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (run_id, lesson_block_id)
);
CREATE INDEX lesson_run_block_progress_lesson_block_id_idx ON lesson_run_block_progress(lesson_block_id);
ALTER TABLE activity_attempts ADD COLUMN run_id UUID REFERENCES lesson_runs(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE lesson_progress ADD COLUMN completed_run_id UUID REFERENCES lesson_runs(id) ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX lesson_progress_completed_run_id_key ON lesson_progress(completed_run_id);

-- Preserve legacy learning records: one historical run per user/lesson.
-- Incomplete traversal becomes ABANDONED; completed lessons and their scores remain durable.
-- Existing Review records predate this boundary and are preserved, not guessed/reversed.
INSERT INTO lesson_runs(id, user_id, lesson_id, request_key, status, started_at, completed_at, abandoned_at, correct_answers, total_activities)
SELECT gen_random_uuid(), sources.user_id, sources.lesson_id, 'legacy-migration-v1',
  CASE WHEN lp.status = 'COMPLETED' THEN 'COMPLETED' ELSE 'ABANDONED' END,
  COALESCE(lp.started_at, CURRENT_TIMESTAMP),
  CASE WHEN lp.status = 'COMPLETED' THEN COALESCE(lp.completed_at, CURRENT_TIMESTAMP) END,
  CASE WHEN lp.status IS DISTINCT FROM 'COMPLETED' THEN CURRENT_TIMESTAMP END,
  CASE WHEN lp.status = 'COMPLETED' THEN 0 END,
  CASE WHEN lp.status = 'COMPLETED' THEN 0 END
FROM (
  SELECT user_id, lesson_id FROM lesson_progress
  UNION SELECT user_id, lesson_id FROM activity_attempts WHERE context = 'LESSON' AND lesson_id IS NOT NULL
  UNION SELECT bp.user_id, b.lesson_id FROM lesson_block_progress bp JOIN lesson_blocks b ON b.id = bp.lesson_block_id
) sources LEFT JOIN lesson_progress lp ON lp.user_id = sources.user_id AND lp.lesson_id = sources.lesson_id;
UPDATE activity_attempts a SET run_id = r.id FROM lesson_runs r
WHERE a.user_id = r.user_id AND a.lesson_id = r.lesson_id AND a.context = 'LESSON';
-- Preserve first-attempt order while repairing any pre-constraint duplicate numbering.
WITH numbered AS (
 SELECT id, row_number() OVER (PARTITION BY run_id, activity_id ORDER BY attempt_number, created_at, id) AS n
 FROM activity_attempts WHERE run_id IS NOT NULL
) UPDATE activity_attempts a SET attempt_number = numbered.n FROM numbered WHERE a.id = numbered.id;
INSERT INTO lesson_run_block_progress(run_id, lesson_block_id, completed_at)
SELECT r.id, bp.lesson_block_id, COALESCE(bp.completed_at, bp.updated_at)
FROM lesson_block_progress bp JOIN lesson_blocks b ON b.id = bp.lesson_block_id
JOIN lesson_runs r ON r.user_id = bp.user_id AND r.lesson_id = b.lesson_id WHERE bp.status = 'COMPLETED';
UPDATE lesson_runs r SET
  correct_answers = (SELECT count(*) FROM activity_attempts a WHERE a.run_id = r.id AND a.attempt_number = 1 AND a.is_correct
    AND EXISTS (SELECT 1 FROM lesson_blocks b WHERE b.lesson_id = r.lesson_id AND b.activity_id = a.activity_id)),
  total_activities = (SELECT count(DISTINCT activity_id) FROM lesson_blocks b WHERE b.lesson_id = r.lesson_id AND b.type = 'ACTIVITY')
WHERE r.status = 'COMPLETED';
UPDATE lesson_progress lp SET completed_run_id = r.id FROM lesson_runs r
WHERE lp.user_id = r.user_id AND lp.lesson_id = r.lesson_id AND r.status = 'COMPLETED';
DELETE FROM lesson_block_progress bp USING lesson_blocks b
WHERE b.id = bp.lesson_block_id AND NOT EXISTS (
 SELECT 1 FROM lesson_progress lp WHERE lp.user_id = bp.user_id AND lp.lesson_id = b.lesson_id AND lp.status = 'COMPLETED');
DELETE FROM lesson_progress WHERE status <> 'COMPLETED';
ALTER TABLE lesson_progress DROP COLUMN current_block_id;
ALTER TABLE lesson_progress ADD CONSTRAINT lesson_progress_durable_completed CHECK (status = 'COMPLETED');
CREATE UNIQUE INDEX activity_attempts_run_id_activity_id_attempt_number_key ON activity_attempts(run_id, activity_id, attempt_number);
ALTER TABLE activity_attempts ADD CONSTRAINT activity_attempts_run_context CHECK (run_id IS NULL OR (context = 'LESSON' AND lesson_id IS NOT NULL));
-- Legacy malformed/unlinked attempts, if any, remain archived with NULL run_id.
-- Every new normal attempt is assigned a run by the service; no implicit endpoints remain.
COMMIT;
