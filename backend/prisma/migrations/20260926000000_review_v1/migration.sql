BEGIN;
LOCK TABLE review_items, activity_attempts IN ACCESS EXCLUSIVE MODE;
DROP INDEX review_items_one_active_per_user_activity_idx;
-- Keep oldest lifecycle, sum errors, ACTIVE wins, preserve latest timestamps.
CREATE TEMP TABLE review_merge ON COMMIT DROP AS
SELECT id, first_value(id) OVER (PARTITION BY user_id, activity_id ORDER BY created_at, id) keeper FROM review_items;
UPDATE review_items r SET incorrect_attempts = a.errors,
 status = CASE WHEN a.active THEN 'ACTIVE' ELSE 'RESOLVED' END,
 resolved_at = CASE WHEN a.active THEN NULL ELSE a.resolved END,
 last_reviewed_at = a.reviewed, updated_at = a.updated, source_lesson_id = a.source
FROM (
 SELECT m.keeper, sum(r.incorrect_attempts)::integer errors, bool_or(r.status = 'ACTIVE') active,
 max(r.resolved_at) resolved, max(r.last_reviewed_at) reviewed, max(r.updated_at) updated,
 (array_agg(r.source_lesson_id ORDER BY r.created_at, r.id) FILTER (WHERE r.source_lesson_id IS NOT NULL))[1] source
 FROM review_items r JOIN review_merge m ON m.id = r.id GROUP BY m.keeper
) a WHERE r.id = a.keeper;
UPDATE activity_attempts a SET review_item_id = m.keeper FROM review_merge m WHERE a.review_item_id = m.id AND m.id <> m.keeper;
DELETE FROM review_items r USING review_merge m WHERE r.id = m.id AND m.id <> m.keeper;
CREATE UNIQUE INDEX review_items_user_id_activity_id_key ON review_items(user_id, activity_id);
-- Retain all attempts; merged Review histories receive chronological numbering.
WITH numbered AS (
 SELECT id, row_number() OVER (PARTITION BY review_item_id ORDER BY created_at, id) n
 FROM activity_attempts WHERE context = 'REVIEW' AND review_item_id IS NOT NULL
)
UPDATE activity_attempts a SET attempt_number = n.n FROM numbered n WHERE a.id = n.id;
CREATE UNIQUE INDEX activity_attempts_review_number_key ON activity_attempts(review_item_id, attempt_number) WHERE context = 'REVIEW';
ALTER TABLE activity_attempts ADD COLUMN review_request_key TEXT, ADD COLUMN review_request_hash TEXT, ADD COLUMN review_result JSONB;
CREATE UNIQUE INDEX activity_attempts_user_id_review_request_key_key ON activity_attempts(user_id, review_request_key);
ALTER TABLE activity_attempts ADD CONSTRAINT activity_attempts_review_request_check CHECK (
 (review_request_key IS NULL AND review_request_hash IS NULL AND review_result IS NULL) OR
 (context = 'REVIEW' AND run_id IS NULL AND review_item_id IS NOT NULL
 AND review_request_key IS NOT NULL AND review_request_key ~ '^[a-zA-Z0-9_-]{16,100}$'
 AND review_request_hash IS NOT NULL AND review_result IS NOT NULL)
);
COMMIT;
