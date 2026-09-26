BEGIN;
-- Existing attempts remain intact; only newly issued tokens carry a batch id.
ALTER TABLE activity_attempts ADD COLUMN review_batch_id UUID;
CREATE UNIQUE INDEX activity_attempts_review_item_id_review_batch_id_key
  ON activity_attempts(review_item_id, review_batch_id);
ALTER TABLE activity_attempts ADD CONSTRAINT activity_attempts_review_batch_check
  CHECK (review_batch_id IS NULL OR (context = 'REVIEW' AND review_item_id IS NOT NULL AND review_request_key IS NOT NULL));
COMMIT;
