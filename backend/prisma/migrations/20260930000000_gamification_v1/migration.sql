BEGIN;
-- AlterTable
ALTER TABLE "coin_transactions" ADD COLUMN     "idempotency_key" TEXT,
ADD COLUMN     "reference_value" TEXT;

-- Preserve existing ledger identities and amounts before enforcing v1 invariants.
UPDATE coin_transactions SET idempotency_key = 'legacy:' || id::text;
-- Older documented ledger names map to the equivalent v1 direction.
UPDATE coin_transactions SET type = CASE type WHEN 'EARN' THEN 'CREDIT' WHEN 'SPEND' THEN 'DEBIT' ELSE type END
WHERE type IN ('EARN', 'SPEND');
ALTER TABLE coin_transactions ALTER COLUMN idempotency_key SET NOT NULL;

-- CreateTable
CREATE TABLE "gamification_learning_events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_id" UUID NOT NULL,
    "learning_date" DATE NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gamification_learning_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_streaks" (
    "user_id" UUID NOT NULL,
    "current_days" INTEGER NOT NULL DEFAULT 0,
    "longest_days" INTEGER NOT NULL DEFAULT 0,
    "last_learning_date" DATE,
    "continuity_through" DATE,
    "last_evaluated_date" DATE,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_streaks_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "gamification_settings" (
    "user_id" UUID NOT NULL,
    "daily_goal_preset" TEXT NOT NULL DEFAULT 'NORMAL',
    "pending_daily_goal_preset" TEXT,
    "pending_effective_date" DATE,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gamification_settings_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "streak_protection_events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "shop_item_id" UUID NOT NULL,
    "protected_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "streak_protection_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "streak_repairs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "broken_date" DATE NOT NULL,
    "previous_streak_days" INTEGER NOT NULL,
    "eligible_until" TIMESTAMPTZ(6) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ELIGIBLE',
    "repaired_at" TIMESTAMPTZ(6),
    "coin_transaction_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "streak_repairs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gamification_learning_events_user_id_learning_date_idx" ON "gamification_learning_events"("user_id", "learning_date");

-- CreateIndex
CREATE INDEX "gamification_learning_events_user_id_occurred_at_idx" ON "gamification_learning_events"("user_id", "occurred_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "gamification_learning_events_user_id_source_type_source_id_key" ON "gamification_learning_events"("user_id", "source_type", "source_id");

-- CreateIndex
CREATE INDEX "streak_protection_events_shop_item_id_idx" ON "streak_protection_events"("shop_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "streak_protection_events_user_id_protected_date_key" ON "streak_protection_events"("user_id", "protected_date");

-- CreateIndex
CREATE UNIQUE INDEX "streak_repairs_coin_transaction_id_key" ON "streak_repairs"("coin_transaction_id");

-- CreateIndex
CREATE INDEX "streak_repairs_user_id_created_at_idx" ON "streak_repairs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "coin_transactions_user_id_idempotency_key_key" ON "coin_transactions"("user_id", "idempotency_key");

-- AddForeignKey
ALTER TABLE "gamification_learning_events" ADD CONSTRAINT "gamification_learning_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_streaks" ADD CONSTRAINT "user_streaks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gamification_settings" ADD CONSTRAINT "gamification_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streak_protection_events" ADD CONSTRAINT "streak_protection_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streak_protection_events" ADD CONSTRAINT "streak_protection_events_shop_item_id_fkey" FOREIGN KEY ("shop_item_id") REFERENCES "shop_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streak_repairs" ADD CONSTRAINT "streak_repairs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streak_repairs" ADD CONSTRAINT "streak_repairs_coin_transaction_id_fkey" FOREIGN KEY ("coin_transaction_id") REFERENCES "coin_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- SQL-only invariants. user_inventory_quantity_check already exists in init.
ALTER TABLE user_streaks ADD CONSTRAINT user_streaks_days_check
  CHECK (current_days >= 0 AND longest_days >= 0 AND longest_days >= current_days);
ALTER TABLE gamification_settings
  ADD CONSTRAINT gamification_settings_preset_check CHECK (daily_goal_preset IN ('CASUAL', 'NORMAL', 'INTENSE')),
  ADD CONSTRAINT gamification_settings_pending_preset_check CHECK (pending_daily_goal_preset IS NULL OR pending_daily_goal_preset IN ('CASUAL', 'NORMAL', 'INTENSE')),
  ADD CONSTRAINT gamification_settings_pending_pair_check CHECK ((pending_daily_goal_preset IS NULL) = (pending_effective_date IS NULL));
ALTER TABLE coin_transactions ADD CONSTRAINT coin_transactions_amount_type_check
  CHECK (amount <> 0 AND ((type = 'CREDIT' AND amount > 0) OR (type = 'DEBIT' AND amount < 0)));
ALTER TABLE shop_items
  ADD CONSTRAINT shop_items_cost_check CHECK (coin_cost >= 0),
  ADD CONSTRAINT shop_items_max_owned_check CHECK (max_owned IS NULL OR max_owned > 0);
ALTER TABLE streak_repairs
  ADD CONSTRAINT streak_repairs_previous_days_check CHECK (previous_streak_days > 0),
  ADD CONSTRAINT streak_repairs_window_check CHECK (eligible_until > created_at),
  ADD CONSTRAINT streak_repairs_lifecycle_check CHECK (
    (status = 'USED' AND repaired_at IS NOT NULL AND coin_transaction_id IS NOT NULL) OR
    (status IN ('ELIGIBLE', 'INVALIDATED') AND repaired_at IS NULL AND coin_transaction_id IS NULL));
CREATE UNIQUE INDEX streak_repairs_one_eligible ON streak_repairs(user_id) WHERE status = 'ELIGIBLE';
ALTER TABLE gamification_learning_events
  ADD CONSTRAINT gamification_learning_events_event_type_check CHECK (event_type IN ('LESSON_COMPLETION', 'LESSON_REPLAY_COMPLETION', 'UNIT_CHALLENGE_COMPLETION', 'REVIEW_COMPLETION', 'PRACTICE_COMPLETION')),
  ADD CONSTRAINT gamification_learning_events_source_type_check CHECK (source_type IN ('LESSON_RUN', 'UNIT_CHALLENGE_RUN', 'REVIEW_BATCH', 'PRACTICE_SESSION'));

COMMIT;
