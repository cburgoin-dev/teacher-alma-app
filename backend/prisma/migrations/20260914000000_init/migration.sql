-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "auth_provider_subject" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "level" TEXT,
    "description" TEXT,
    "cover_url" TEXT,
    "status" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topics" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "access_type" TEXT NOT NULL DEFAULT 'FREE',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "explanation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_blocks" (
    "id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "content" JSONB NOT NULL DEFAULT '{}',
    "activity_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_progress" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_progress" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "current_block_id" UUID,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_block_progress" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "lesson_block_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "completed_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_block_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_attempts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "lesson_id" UUID,
    "review_item_id" UUID,
    "context" TEXT NOT NULL,
    "answer_data" JSONB NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_items" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "source_lesson_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "incorrect_attempts" INTEGER NOT NULL DEFAULT 1,
    "last_reviewed_at" TIMESTAMPTZ(6),
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostics" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diagnostics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostic_questions" (
    "id" UUID NOT NULL,
    "diagnostic_id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "weight" DECIMAL(6,3) NOT NULL DEFAULT 1,
    "target_level" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diagnostic_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostic_attempts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "diagnostic_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "internal_score" DECIMAL(8,3),
    "recommended_level" TEXT,
    "recommended_course_id" UUID,
    "strengths" JSONB,
    "reinforcement_areas" JSONB,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "diagnostic_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostic_answers" (
    "id" UUID NOT NULL,
    "diagnostic_attempt_id" UUID NOT NULL,
    "diagnostic_question_id" UUID NOT NULL,
    "answer_data" JSONB NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diagnostic_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_days" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "activity_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coin_transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "reference_type" TEXT,
    "reference_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coin_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_items" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "item_type" TEXT NOT NULL,
    "coin_cost" INTEGER NOT NULL,
    "max_owned" INTEGER,
    "config" JSONB NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_inventory" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "shop_item_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "streak_challenges" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "shop_item_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "started_on" DATE NOT NULL,
    "ends_on" DATE NOT NULL,
    "entry_cost" INTEGER NOT NULL,
    "reward_amount" INTEGER NOT NULL,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "streak_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "course_id" UUID,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "provider_product_ids" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "external_transaction_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "purchased_at" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entitlements" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "scope" TEXT NOT NULL,
    "course_id" UUID,
    "source_purchase_id" UUID,
    "status" TEXT NOT NULL,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_provider_subject_key" ON "users"("auth_provider_subject");

-- CreateIndex
CREATE UNIQUE INDEX "courses_slug_key" ON "courses"("slug");

-- CreateIndex
CREATE INDEX "courses_status_position_idx" ON "courses"("status", "position");

-- CreateIndex
CREATE INDEX "topics_course_id_idx" ON "topics"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "topics_course_id_position_key" ON "topics"("course_id", "position");

-- CreateIndex
CREATE INDEX "lessons_topic_id_idx" ON "lessons"("topic_id");

-- CreateIndex
CREATE INDEX "lessons_access_type_idx" ON "lessons"("access_type");

-- CreateIndex
CREATE UNIQUE INDEX "lessons_topic_id_position_key" ON "lessons"("topic_id", "position");

-- CreateIndex
CREATE INDEX "lesson_blocks_lesson_id_idx" ON "lesson_blocks"("lesson_id");

-- CreateIndex
CREATE INDEX "lesson_blocks_activity_id_idx" ON "lesson_blocks"("activity_id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_blocks_lesson_id_position_key" ON "lesson_blocks"("lesson_id", "position");

-- CreateIndex
CREATE INDEX "course_progress_user_id_status_idx" ON "course_progress"("user_id", "status");

-- CreateIndex
CREATE INDEX "course_progress_course_id_idx" ON "course_progress"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "course_progress_user_id_course_id_key" ON "course_progress"("user_id", "course_id");

-- CreateIndex
CREATE INDEX "lesson_progress_user_id_status_idx" ON "lesson_progress"("user_id", "status");

-- CreateIndex
CREATE INDEX "lesson_progress_lesson_id_idx" ON "lesson_progress"("lesson_id");

-- CreateIndex
CREATE INDEX "lesson_progress_current_block_id_idx" ON "lesson_progress"("current_block_id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_progress_user_id_lesson_id_key" ON "lesson_progress"("user_id", "lesson_id");

-- CreateIndex
CREATE INDEX "lesson_block_progress_user_id_idx" ON "lesson_block_progress"("user_id");

-- CreateIndex
CREATE INDEX "lesson_block_progress_lesson_block_id_idx" ON "lesson_block_progress"("lesson_block_id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_block_progress_user_id_lesson_block_id_key" ON "lesson_block_progress"("user_id", "lesson_block_id");

-- CreateIndex
CREATE INDEX "activity_attempts_user_id_activity_id_created_at_idx" ON "activity_attempts"("user_id", "activity_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "activity_attempts_lesson_id_idx" ON "activity_attempts"("lesson_id");

-- CreateIndex
CREATE INDEX "activity_attempts_activity_id_idx" ON "activity_attempts"("activity_id");

-- CreateIndex
CREATE INDEX "activity_attempts_review_item_id_idx" ON "activity_attempts"("review_item_id");

-- CreateIndex
CREATE INDEX "review_items_user_id_status_idx" ON "review_items"("user_id", "status");

-- CreateIndex
CREATE INDEX "review_items_activity_id_idx" ON "review_items"("activity_id");

-- CreateIndex
CREATE INDEX "review_items_source_lesson_id_idx" ON "review_items"("source_lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "diagnostics_version_key" ON "diagnostics"("version");

-- CreateIndex
CREATE INDEX "diagnostic_questions_diagnostic_id_idx" ON "diagnostic_questions"("diagnostic_id");

-- CreateIndex
CREATE INDEX "diagnostic_questions_activity_id_idx" ON "diagnostic_questions"("activity_id");

-- CreateIndex
CREATE UNIQUE INDEX "diagnostic_questions_diagnostic_id_position_key" ON "diagnostic_questions"("diagnostic_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "diagnostic_questions_diagnostic_id_activity_id_key" ON "diagnostic_questions"("diagnostic_id", "activity_id");

-- CreateIndex
CREATE INDEX "diagnostic_attempts_user_id_started_at_idx" ON "diagnostic_attempts"("user_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "diagnostic_attempts_diagnostic_id_idx" ON "diagnostic_attempts"("diagnostic_id");

-- CreateIndex
CREATE INDEX "diagnostic_attempts_recommended_course_id_idx" ON "diagnostic_attempts"("recommended_course_id");

-- CreateIndex
CREATE INDEX "diagnostic_answers_diagnostic_attempt_id_idx" ON "diagnostic_answers"("diagnostic_attempt_id");

-- CreateIndex
CREATE INDEX "diagnostic_answers_diagnostic_question_id_idx" ON "diagnostic_answers"("diagnostic_question_id");

-- CreateIndex
CREATE UNIQUE INDEX "diagnostic_answers_diagnostic_attempt_id_diagnostic_questio_key" ON "diagnostic_answers"("diagnostic_attempt_id", "diagnostic_question_id");

-- CreateIndex
CREATE INDEX "learning_days_user_id_activity_date_idx" ON "learning_days"("user_id", "activity_date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "learning_days_user_id_activity_date_key" ON "learning_days"("user_id", "activity_date");

-- CreateIndex
CREATE INDEX "coin_transactions_user_id_created_at_idx" ON "coin_transactions"("user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "shop_items_code_key" ON "shop_items"("code");

-- CreateIndex
CREATE INDEX "user_inventory_shop_item_id_idx" ON "user_inventory"("shop_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_inventory_user_id_shop_item_id_key" ON "user_inventory"("user_id", "shop_item_id");

-- CreateIndex
CREATE INDEX "streak_challenges_user_id_status_idx" ON "streak_challenges"("user_id", "status");

-- CreateIndex
CREATE INDEX "streak_challenges_shop_item_id_idx" ON "streak_challenges"("shop_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_code_key" ON "products"("code");

-- CreateIndex
CREATE INDEX "products_course_id_idx" ON "products"("course_id");

-- CreateIndex
CREATE INDEX "purchases_user_id_status_idx" ON "purchases"("user_id", "status");

-- CreateIndex
CREATE INDEX "purchases_product_id_idx" ON "purchases"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_provider_external_transaction_id_key" ON "purchases"("provider", "external_transaction_id");

-- CreateIndex
CREATE INDEX "entitlements_user_id_status_expires_at_idx" ON "entitlements"("user_id", "status", "expires_at");

-- CreateIndex
CREATE INDEX "entitlements_course_id_idx" ON "entitlements"("course_id");

-- CreateIndex
CREATE INDEX "entitlements_source_purchase_id_idx" ON "entitlements"("source_purchase_id");

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_blocks" ADD CONSTRAINT "lesson_blocks_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_blocks" ADD CONSTRAINT "lesson_blocks_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_progress" ADD CONSTRAINT "course_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_progress" ADD CONSTRAINT "course_progress_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_current_block_id_fkey" FOREIGN KEY ("current_block_id") REFERENCES "lesson_blocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_block_progress" ADD CONSTRAINT "lesson_block_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_block_progress" ADD CONSTRAINT "lesson_block_progress_lesson_block_id_fkey" FOREIGN KEY ("lesson_block_id") REFERENCES "lesson_blocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_attempts" ADD CONSTRAINT "activity_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_attempts" ADD CONSTRAINT "activity_attempts_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_attempts" ADD CONSTRAINT "activity_attempts_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_attempts" ADD CONSTRAINT "activity_attempts_review_item_id_fkey" FOREIGN KEY ("review_item_id") REFERENCES "review_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_items" ADD CONSTRAINT "review_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_items" ADD CONSTRAINT "review_items_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_items" ADD CONSTRAINT "review_items_source_lesson_id_fkey" FOREIGN KEY ("source_lesson_id") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_questions" ADD CONSTRAINT "diagnostic_questions_diagnostic_id_fkey" FOREIGN KEY ("diagnostic_id") REFERENCES "diagnostics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_questions" ADD CONSTRAINT "diagnostic_questions_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_attempts" ADD CONSTRAINT "diagnostic_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_attempts" ADD CONSTRAINT "diagnostic_attempts_diagnostic_id_fkey" FOREIGN KEY ("diagnostic_id") REFERENCES "diagnostics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_attempts" ADD CONSTRAINT "diagnostic_attempts_recommended_course_id_fkey" FOREIGN KEY ("recommended_course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_answers" ADD CONSTRAINT "diagnostic_answers_diagnostic_attempt_id_fkey" FOREIGN KEY ("diagnostic_attempt_id") REFERENCES "diagnostic_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_answers" ADD CONSTRAINT "diagnostic_answers_diagnostic_question_id_fkey" FOREIGN KEY ("diagnostic_question_id") REFERENCES "diagnostic_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_days" ADD CONSTRAINT "learning_days_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_transactions" ADD CONSTRAINT "coin_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_inventory" ADD CONSTRAINT "user_inventory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_inventory" ADD CONSTRAINT "user_inventory_shop_item_id_fkey" FOREIGN KEY ("shop_item_id") REFERENCES "shop_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streak_challenges" ADD CONSTRAINT "streak_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streak_challenges" ADD CONSTRAINT "streak_challenges_shop_item_id_fkey" FOREIGN KEY ("shop_item_id") REFERENCES "shop_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_source_purchase_id_fkey" FOREIGN KEY ("source_purchase_id") REFERENCES "purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- These documented constraints are maintained in SQL, outside Prisma schema syntax.
-- They are appended below the generated table and foreign-key definitions.

ALTER TABLE "lesson_blocks"
  ADD CONSTRAINT "lesson_blocks_activity_required_check"
  CHECK ("type" <> 'ACTIVITY' OR "activity_id" IS NOT NULL);

ALTER TABLE "user_inventory"
  ADD CONSTRAINT "user_inventory_quantity_check"
  CHECK ("quantity" >= 0);

ALTER TABLE "streak_challenges"
  ADD CONSTRAINT "streak_challenges_dates_check"
  CHECK ("ends_on" >= "started_on");

ALTER TABLE "products"
  ADD CONSTRAINT "products_course_required_check"
  CHECK ("type" <> 'COURSE_PURCHASE' OR "course_id" IS NOT NULL);

ALTER TABLE "entitlements"
  ADD CONSTRAINT "entitlements_course_required_check"
  CHECK ("scope" <> 'COURSE' OR "course_id" IS NOT NULL);

CREATE UNIQUE INDEX "review_items_one_active_per_user_activity_idx"
  ON "review_items" ("user_id", "activity_id") WHERE "status" = 'ACTIVE';

CREATE UNIQUE INDEX "streak_challenges_one_active_per_user_idx"
  ON "streak_challenges" ("user_id") WHERE "status" = 'ACTIVE';
