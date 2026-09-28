-- CreateTable
-- Text states, lifecycle invariants and the ACTIVE partial index are added below.
CREATE TABLE "unit_challenges" (
    "id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "passing_score" INTEGER,
    "access_type" TEXT NOT NULL DEFAULT 'FREE',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unit_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_challenge_phases" (
    "id" UUID NOT NULL,
    "unit_challenge_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "config" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unit_challenge_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_challenge_runs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "unit_challenge_id" UUID NOT NULL,
    "request_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "passing_score_snapshot" INTEGER,
    "correct_items" INTEGER,
    "total_items" INTEGER NOT NULL,
    "passed" BOOLEAN,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "abandoned_at" TIMESTAMPTZ(6),

    CONSTRAINT "unit_challenge_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_challenge_run_phases" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "source_phase_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "content_snapshot" JSONB NOT NULL,
    "answer_data" JSONB,
    "correct_items" INTEGER,
    "total_items" INTEGER NOT NULL,
    "submission_request_key" TEXT,
    "submission_request_hash" TEXT,
    "submission_response" JSONB,
    "submitted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unit_challenge_run_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_challenge_progress" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "unit_challenge_id" UUID NOT NULL,
    "passed_run_id" UUID NOT NULL,
    "completed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unit_challenge_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "unit_challenges_topic_id_key" ON "unit_challenges"("topic_id");

-- CreateIndex
CREATE INDEX "unit_challenges_status_idx" ON "unit_challenges"("status");

-- CreateIndex
CREATE INDEX "unit_challenges_access_type_idx" ON "unit_challenges"("access_type");

-- CreateIndex
CREATE INDEX "unit_challenge_phases_unit_challenge_id_idx" ON "unit_challenge_phases"("unit_challenge_id");

-- CreateIndex
CREATE UNIQUE INDEX "unit_challenge_phases_unit_challenge_id_position_key" ON "unit_challenge_phases"("unit_challenge_id", "position");

-- CreateIndex
CREATE INDEX "unit_challenge_runs_unit_challenge_id_idx" ON "unit_challenge_runs"("unit_challenge_id");

-- CreateIndex
CREATE INDEX "unit_challenge_runs_user_id_status_idx" ON "unit_challenge_runs"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "unit_challenge_runs_user_id_unit_challenge_id_request_key_key" ON "unit_challenge_runs"("user_id", "unit_challenge_id", "request_key");

-- CreateIndex
CREATE INDEX "unit_challenge_run_phases_source_phase_id_idx" ON "unit_challenge_run_phases"("source_phase_id");

-- CreateIndex
CREATE INDEX "unit_challenge_run_phases_run_id_submitted_at_position_idx" ON "unit_challenge_run_phases"("run_id", "submitted_at", "position");

-- CreateIndex
CREATE UNIQUE INDEX "unit_challenge_run_phases_run_id_position_key" ON "unit_challenge_run_phases"("run_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "unit_challenge_run_phases_run_id_source_phase_id_key" ON "unit_challenge_run_phases"("run_id", "source_phase_id");

-- CreateIndex
CREATE UNIQUE INDEX "unit_challenge_run_phases_run_id_submission_request_key_key" ON "unit_challenge_run_phases"("run_id", "submission_request_key");

-- CreateIndex
CREATE UNIQUE INDEX "unit_challenge_progress_passed_run_id_key" ON "unit_challenge_progress"("passed_run_id");

-- CreateIndex
CREATE INDEX "unit_challenge_progress_unit_challenge_id_idx" ON "unit_challenge_progress"("unit_challenge_id");

-- CreateIndex
CREATE INDEX "unit_challenge_progress_user_id_idx" ON "unit_challenge_progress"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "unit_challenge_progress_user_id_unit_challenge_id_key" ON "unit_challenge_progress"("user_id", "unit_challenge_id");

-- AddForeignKey
ALTER TABLE "unit_challenges" ADD CONSTRAINT "unit_challenges_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_challenge_phases" ADD CONSTRAINT "unit_challenge_phases_unit_challenge_id_fkey" FOREIGN KEY ("unit_challenge_id") REFERENCES "unit_challenges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_challenge_runs" ADD CONSTRAINT "unit_challenge_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_challenge_runs" ADD CONSTRAINT "unit_challenge_runs_unit_challenge_id_fkey" FOREIGN KEY ("unit_challenge_id") REFERENCES "unit_challenges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_challenge_run_phases" ADD CONSTRAINT "unit_challenge_run_phases_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "unit_challenge_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_challenge_run_phases" ADD CONSTRAINT "unit_challenge_run_phases_source_phase_id_fkey" FOREIGN KEY ("source_phase_id") REFERENCES "unit_challenge_phases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_challenge_progress" ADD CONSTRAINT "unit_challenge_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_challenge_progress" ADD CONSTRAINT "unit_challenge_progress_unit_challenge_id_fkey" FOREIGN KEY ("unit_challenge_id") REFERENCES "unit_challenges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_challenge_progress" ADD CONSTRAINT "unit_challenge_progress_passed_run_id_fkey" FOREIGN KEY ("passed_run_id") REFERENCES "unit_challenge_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE unit_challenges
  ADD CONSTRAINT unit_challenges_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  ADD CONSTRAINT unit_challenges_access CHECK (access_type IN ('FREE', 'PAID')),
  ADD CONSTRAINT unit_challenges_threshold CHECK (passing_score IS NULL OR passing_score BETWEEN 0 AND 100);
ALTER TABLE unit_challenge_phases
  ADD CONSTRAINT unit_challenge_phases_type CHECK (type IN ('CONVERSATION', 'CROSSWORD')),
  ADD CONSTRAINT unit_challenge_phases_position CHECK (position >= 1);
CREATE UNIQUE INDEX unit_challenge_runs_one_active ON unit_challenge_runs(user_id, unit_challenge_id) WHERE status = 'ACTIVE';
ALTER TABLE unit_challenge_runs
  ADD CONSTRAINT unit_challenge_runs_threshold CHECK (passing_score_snapshot IS NULL OR passing_score_snapshot BETWEEN 0 AND 100),
  ADD CONSTRAINT unit_challenge_runs_total CHECK (total_items > 0),
  ADD CONSTRAINT unit_challenge_runs_lifecycle CHECK (
    (status = 'ACTIVE' AND completed_at IS NULL AND abandoned_at IS NULL AND correct_items IS NULL AND passed IS NULL) OR
    (status = 'COMPLETED' AND completed_at IS NOT NULL AND abandoned_at IS NULL AND correct_items IS NOT NULL AND correct_items BETWEEN 0 AND total_items AND passed IS NOT NULL) OR
    (status = 'ABANDONED' AND abandoned_at IS NOT NULL AND completed_at IS NULL AND correct_items IS NULL AND passed IS NULL));
ALTER TABLE unit_challenge_run_phases
  ADD CONSTRAINT unit_challenge_run_phases_type CHECK (type IN ('CONVERSATION', 'CROSSWORD')),
  ADD CONSTRAINT unit_challenge_run_phases_position CHECK (position >= 1),
  ADD CONSTRAINT unit_challenge_run_phases_total CHECK (total_items > 0),
  ADD CONSTRAINT unit_challenge_run_phases_submission CHECK (
    (submitted_at IS NULL AND answer_data IS NULL AND correct_items IS NULL AND submission_request_key IS NULL AND submission_request_hash IS NULL AND submission_response IS NULL) OR
    (submitted_at IS NOT NULL AND answer_data IS NOT NULL AND correct_items IS NOT NULL AND correct_items BETWEEN 0 AND total_items AND submission_request_key IS NOT NULL AND submission_request_hash IS NOT NULL));
