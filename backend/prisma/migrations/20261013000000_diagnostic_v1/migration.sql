ALTER TABLE diagnostics ADD COLUMN estimated_minutes INTEGER,
  ADD COLUMN scoring_config JSONB NOT NULL DEFAULT '{}';
ALTER TABLE diagnostics ADD CONSTRAINT diagnostics_status CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED')),
  ADD CONSTRAINT diagnostics_metadata CHECK (version > 0 AND (estimated_minutes IS NULL OR estimated_minutes > 0));
CREATE UNIQUE INDEX diagnostics_one_published ON diagnostics (status) WHERE status = 'PUBLISHED';
ALTER TABLE diagnostic_questions ADD CONSTRAINT diagnostic_questions_values CHECK (position > 0 AND weight > 0 AND (target_level IS NULL OR length(trim(target_level)) > 0));

ALTER TABLE diagnostic_attempts ADD COLUMN request_key TEXT, ADD COLUMN abandoned_at TIMESTAMPTZ(6);
-- Preserve legacy history; synthetic keys cannot collide with client UUID keys.
UPDATE diagnostic_attempts SET request_key = 'legacy_' || id::text;
UPDATE diagnostic_attempts SET status = 'ABANDONED', abandoned_at = COALESCE(completed_at, started_at), completed_at = NULL WHERE status IN ('IN_PROGRESS', 'ACTIVE', 'ABANDONED');
ALTER TABLE diagnostic_attempts ALTER COLUMN request_key SET NOT NULL;
ALTER TABLE diagnostic_attempts ADD CONSTRAINT diagnostic_attempts_lifecycle CHECK (
  (status = 'ACTIVE' AND completed_at IS NULL AND abandoned_at IS NULL AND internal_score IS NULL AND recommended_level IS NULL AND recommended_course_id IS NULL)
  OR (status = 'ABANDONED' AND completed_at IS NULL AND abandoned_at IS NOT NULL)
  OR (status = 'COMPLETED' AND completed_at IS NOT NULL AND abandoned_at IS NULL)
), ADD CONSTRAINT diagnostic_attempts_score CHECK (internal_score IS NULL OR internal_score BETWEEN 0 AND 100),
  ADD CONSTRAINT diagnostic_attempts_request_key CHECK (request_key ~ '^[A-Za-z0-9_-]{16,100}$');
CREATE UNIQUE INDEX diagnostic_attempts_user_id_request_key_key ON diagnostic_attempts(user_id, request_key);
CREATE UNIQUE INDEX diagnostic_attempts_one_active ON diagnostic_attempts(user_id) WHERE status = 'ACTIVE';
CREATE INDEX diagnostic_attempts_user_id_completed_at_idx ON diagnostic_attempts(user_id, completed_at DESC);
ALTER TABLE diagnostic_attempts DROP CONSTRAINT diagnostic_attempts_recommended_course_id_fkey;
ALTER TABLE diagnostic_attempts ADD CONSTRAINT diagnostic_attempts_recommended_course_id_fkey FOREIGN KEY(recommended_course_id) REFERENCES courses(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE diagnostic_answers ADD COLUMN submission_request_key TEXT,
  ADD COLUMN submission_request_hash TEXT, ADD COLUMN submission_response JSONB;
UPDATE diagnostic_answers SET submission_request_key = 'legacy_' || id::text,
  submission_request_hash = repeat('0',64), submission_response = '{"legacy":true}';
ALTER TABLE diagnostic_answers ALTER COLUMN submission_request_key SET NOT NULL,
  ALTER COLUMN submission_request_hash SET NOT NULL, ALTER COLUMN submission_response SET NOT NULL;
ALTER TABLE diagnostic_answers ADD CONSTRAINT diagnostic_answers_request CHECK (
  submission_request_key ~ '^[A-Za-z0-9_-]{16,100}$' AND submission_request_hash ~ '^[a-f0-9]{64}$' AND jsonb_typeof(submission_response) = 'object');
CREATE UNIQUE INDEX diagnostic_answers_attempt_submission_key ON diagnostic_answers(diagnostic_attempt_id, submission_request_key);

-- Academic updates are forbidden after publication, including archived versions.
-- Unreferenced archived fixtures/content can still be removed by maintenance.
CREATE FUNCTION diagnostic_definition_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('PUBLISHED','ARCHIVED') AND
    (NEW.version IS DISTINCT FROM OLD.version OR NEW.scoring_config IS DISTINCT FROM OLD.scoring_config
     OR NEW.status = 'DRAFT' OR (OLD.status = 'ARCHIVED' AND NEW.status <> 'ARCHIVED')) THEN
    RAISE EXCEPTION 'diagnostic_published_content_immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER diagnostic_definition_immutable BEFORE UPDATE ON diagnostics FOR EACH ROW EXECUTE FUNCTION diagnostic_definition_immutable();
CREATE FUNCTION diagnostic_question_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_id uuid; parent_status text;
BEGIN
  parent_id := CASE WHEN TG_OP = 'INSERT' THEN NEW.diagnostic_id ELSE OLD.diagnostic_id END;
  SELECT status INTO parent_status FROM diagnostics WHERE id = parent_id FOR SHARE;
  IF parent_status IN ('PUBLISHED','ARCHIVED') AND
     (TG_OP <> 'DELETE' OR parent_status = 'PUBLISHED' OR EXISTS (SELECT 1 FROM diagnostic_attempts WHERE diagnostic_id = parent_id)) THEN
    RAISE EXCEPTION 'diagnostic_published_content_immutable';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.diagnostic_id <> OLD.diagnostic_id AND EXISTS (SELECT 1 FROM diagnostics WHERE id = NEW.diagnostic_id AND status <> 'DRAFT') THEN
    RAISE EXCEPTION 'diagnostic_published_content_immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER diagnostic_question_immutable BEFORE INSERT OR UPDATE OR DELETE ON diagnostic_questions FOR EACH ROW EXECUTE FUNCTION diagnostic_question_immutable();
CREATE FUNCTION diagnostic_activity_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.type IS DISTINCT FROM OLD.type OR NEW.prompt IS DISTINCT FROM OLD.prompt OR NEW.config IS DISTINCT FROM OLD.config
      OR NEW.status IS DISTINCT FROM OLD.status OR NEW.explanation IS DISTINCT FROM OLD.explanation)
    AND EXISTS (SELECT 1 FROM diagnostic_questions q JOIN diagnostics d ON d.id = q.diagnostic_id WHERE q.activity_id = OLD.id AND d.status IN ('PUBLISHED','ARCHIVED')) THEN
    RAISE EXCEPTION 'diagnostic_published_activity_immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER diagnostic_activity_immutable BEFORE UPDATE ON activities FOR EACH ROW EXECUTE FUNCTION diagnostic_activity_immutable();
