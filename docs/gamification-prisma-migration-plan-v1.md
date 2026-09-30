# Gamification v1 — Prisma and migration plan

**Status:** approved design candidate / pre-implementation  
**Scope:** Gamification v1 backend persistence  
**Branch:** `feature/gamification-v1`  
**Depends on:** `docs/gamification-semantics-v1.md`, `docs/gamification-backend-contract-v1.md`

This plan translates the Gamification v1 backend contract into the exact persistence delta expected for Prisma/PostgreSQL. It intentionally does **not** apply the migration yet.

The repository convention remains:

- Prisma models for ordinary structure and relations;
- text status/type fields rather than Prisma/native enums;
- SQL migrations for CHECK constraints, partial unique indexes and concurrency-sensitive database guarantees.

## 1. Current reusable schema

The current schema already contains:

- `users.timezone`;
- `learning_days`;
- `coin_transactions`;
- `shop_items`;
- `user_inventory`;
- `streak_challenges`.

### Keep

- `LearningDay`
- `CoinTransaction` concept, with new fields/constraints
- `ShopItem`
- `UserInventory`
- `User.timezone`

### Leave dormant

- `StreakChallenge`

Its current paid-entry shape belongs to an older concept and is not part of Gamification v1. Do not remove it in this migration unless implementation discovers an actual conflict; do not wire new v1 behavior to it.

## 2. New model: GamificationLearningEvent

Purpose: one durable row per qualifying completed learning session.

Recommended Prisma shape:

```prisma
model GamificationLearningEvent {
  id           String   @id @default(uuid()) @db.Uuid
  userId       String   @map("user_id") @db.Uuid
  eventType    String   @map("event_type") @db.Text
  sourceType   String   @map("source_type") @db.Text
  sourceId     String   @map("source_id") @db.Uuid
  learningDate DateTime @map("learning_date") @db.Date
  occurredAt   DateTime @map("occurred_at") @db.Timestamptz(6)
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, sourceType, sourceId])
  @@index([userId, learningDate])
  @@index([userId, occurredAt(sort: Desc)])
  @@map("gamification_learning_events")
}
```

Initial `event_type` values:

```text
LESSON_COMPLETION
LESSON_REPLAY_COMPLETION
UNIT_CHALLENGE_COMPLETION
REVIEW_COMPLETION
PRACTICE_COMPLETION
```

Initial `source_type` values:

```text
LESSON_RUN
UNIT_CHALLENGE_RUN
REVIEW_BATCH
PRACTICE_SESSION
```

The unique source identity provides retry-safe Daily Goal units.

## 3. Existing model: LearningDay

Keep the existing shape:

```text
user_id
activity_date
UNIQUE(user_id, activity_date)
```

Semantic clarification:

- inserted only from real qualifying learning events;
- Protector-covered dates do not create rows;
- Repair does not create rows;
- historical dates are immutable after derivation.

Recommended additional index is not required because the existing unique key and descending user/date index are already sufficient.

## 4. New model: UserStreak

Purpose: compact authoritative state for current/longest streak while durable history remains auditable.

Recommended Prisma shape:

```prisma
model UserStreak {
  userId             String    @id @map("user_id") @db.Uuid
  currentDays        Int       @default(0) @map("current_days")
  longestDays        Int       @default(0) @map("longest_days")
  lastLearningDate   DateTime? @map("last_learning_date") @db.Date
  continuityThrough  DateTime? @map("continuity_through") @db.Date
  lastEvaluatedDate  DateTime? @map("last_evaluated_date") @db.Date
  updatedAt          DateTime  @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_streaks")
}
```

Field meaning:

- `currentDays`: count of real learning days in the current protected/repaired streak;
- `longestDays`: lifetime personal best;
- `lastLearningDate`: most recent real `LearningDay`;
- `continuityThrough`: last calendar date through which the current streak has valid continuity, including Protector/Repair coverage;
- `lastEvaluatedDate`: last closed local date whose missed-day outcome has been reconciled.

Important: a Protector preserves continuity but **does not increment `currentDays`**. Repair restores the previous count but does not add the missed date as a study day.

SQL CHECKs:

```sql
current_days >= 0
longest_days >= 0
longest_days >= current_days
```

## 5. New model: GamificationSettings

Purpose: Daily Goal preference and deferred next-day change.

Recommended Prisma shape:

```prisma
model GamificationSettings {
  userId                 String    @id @map("user_id") @db.Uuid
  dailyGoalPreset        String    @default("NORMAL") @map("daily_goal_preset") @db.Text
  pendingDailyGoalPreset String?   @map("pending_daily_goal_preset") @db.Text
  pendingEffectiveDate   DateTime? @map("pending_effective_date") @db.Date
  updatedAt              DateTime  @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("gamification_settings")
}
```

SQL CHECKs:

- current preset in `CASUAL | NORMAL | INTENSE`;
- pending preset null or in the same set;
- pending preset and pending effective date are both null or both non-null.

No separate Daily Goal progress table is planned. Progress is derived from `GamificationLearningEvent`.

## 6. Existing model: CoinTransaction

Current model is reusable but needs stronger idempotency.

Add:

```prisma
referenceValue String? @map("reference_value") @db.Text
idempotencyKey String  @map("idempotency_key") @db.Text
```

Final conceptual shape:

```text
id
user_id
amount
type
reason
reference_type nullable
reference_id nullable UUID
reference_value nullable text
idempotency_key
created_at
```

Add:

```text
UNIQUE(user_id, idempotency_key)
```

Recommended SQL CHECKs:

- `amount <> 0`;
- `type IN ('CREDIT', 'DEBIT')`;
- CREDIT requires `amount > 0`;
- DEBIT requires `amount < 0`.

Initial `reason` values:

```text
LESSON_FIRST_COMPLETION
LESSON_FIRST_PERFECT
UNIT_CHALLENGE_FIRST_PASS
UNIT_CHALLENGE_FIRST_PERFECT
COURSE_COMPLETION
DAILY_GOAL
STREAK_MILESTONE
STREAK_PROTECTOR_PURCHASE
STREAK_REPAIR
```

A strict CHECK on `reason` is optional. Because reward reasons are expected to grow, application validation plus stable idempotency may be preferable to requiring a database migration for every future reward type.

### Existing-row migration

Do not assume the table is empty.

For any existing row, backfill:

```text
idempotency_key = 'legacy:' || id
```

Then make the column NOT NULL and add the unique index.

No balance column is added.

Authoritative v1 balance:

```sql
SUM(coin_transactions.amount)
```

## 7. Existing models: ShopItem and UserInventory

Keep both generic models.

For v1 the only required seeded item is:

```text
code       STREAK_PROTECTOR
itemType   CONSUMABLE
coinCost   50
maxOwned   2
active     true
```

Recommended SQL hardening if not already present:

- `shop_items.coin_cost >= 0`;
- `shop_items.max_owned IS NULL OR max_owned > 0`;
- `user_inventory.quantity >= 0`.

Do not seed vehicle/cosmetic catalog items.

The Protector catalog row should be created by an idempotent seed/upsert path, not by relying on client hardcoding.

## 8. New model: StreakProtectionEvent

Purpose: durable evidence that a missed local date was covered by a Protector.

Recommended Prisma shape:

```prisma
model StreakProtectionEvent {
  id            String   @id @default(uuid()) @db.Uuid
  userId        String   @map("user_id") @db.Uuid
  shopItemId    String   @map("shop_item_id") @db.Uuid
  protectedDate DateTime @map("protected_date") @db.Date
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  shopItem ShopItem @relation(fields: [shopItemId], references: [id], onDelete: Restrict)

  @@unique([userId, protectedDate])
  @@index([shopItemId])
  @@map("streak_protection_events")
}
```

Protector consumption decrements `UserInventory.quantity` and inserts this row in the same database transaction.

No coin transaction is created when the Protector is consumed; coins were spent when it was purchased.

## 9. New model: StreakRepair

Purpose: contextual recovery candidate/history, not inventory.

Recommended Prisma shape:

```prisma
model StreakRepair {
  id                String           @id @default(uuid()) @db.Uuid
  userId            String           @map("user_id") @db.Uuid
  brokenDate        DateTime         @map("broken_date") @db.Date
  previousStreakDays Int             @map("previous_streak_days")
  eligibleUntil     DateTime         @map("eligible_until") @db.Timestamptz(6)
  status            String           @default("ELIGIBLE") @db.Text
  repairedAt        DateTime?        @map("repaired_at") @db.Timestamptz(6)
  coinTransactionId String?          @unique @map("coin_transaction_id") @db.Uuid
  createdAt         DateTime         @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt         DateTime         @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)

  user            User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  coinTransaction CoinTransaction? @relation(fields: [coinTransactionId], references: [id], onDelete: Restrict)

  @@index([userId, createdAt(sort: Desc)])
  @@map("streak_repairs")
}
```

Initial statuses:

```text
ELIGIBLE
USED
INVALIDATED
```

Expiration remains time-derived from `eligible_until`; no cron mutation to EXPIRED is necessary.

SQL requirements:

- `previous_streak_days > 0`;
- `eligible_until > created_at`;
- USED requires `repaired_at IS NOT NULL` and `coin_transaction_id IS NOT NULL`;
- non-USED rows require `repaired_at IS NULL` and `coin_transaction_id IS NULL`;
- partial unique index: at most one `ELIGIBLE` repair row per user.

If another uncovered missed day occurs before Repair is used, invalidate the candidate.

The 14-day cooldown is evaluated against the user's most recent `USED.repaired_at`.

## 10. User relations

Add Prisma relations from `User` for:

```text
gamificationLearningEvents
streak
gamificationSettings
streakProtectionEvents
streakRepairs
```

Add reverse relation from `CoinTransaction` to optional `StreakRepair`.

Add reverse relation from `ShopItem` to `StreakProtectionEvent`.

No relation from learning events directly to LessonRun/UnitChallengeRun is required because `sourceType + sourceId` is deliberately polymorphic and idempotent.

## 11. Streak milestone persistence

Do **not** add a per-user milestone table in v1.

Milestone payout history is represented by `CoinTransaction`:

```text
reason = STREAK_MILESTONE
reference_value = "30"
idempotency_key = "streak-milestone:30"
```

That guarantees lifetime-unique payout.

Repeated future attainment can still be detected by the service for presentation/celebration without another transaction.

## 12. Daily Goal persistence

Do **not** add `daily_goal_progress`.

For the current local learning date:

```text
progress = COUNT(gamification_learning_events)
           WHERE user_id = ?
             AND learning_date = ?
```

Reward existence:

```text
coin_transactions.idempotency_key = "daily-goal:<YYYY-MM-DD>"
```

This makes progress reproducible and removes counter synchronization risk.

## 13. Per-user concurrency strategy

Because v1 intentionally does not persist a mutable coin balance, concurrent spend correctness must not rely on:

```text
SELECT SUM(balance) -> INSERT debit
```

without serialization.

Use the repository's existing PostgreSQL/user-row locking pattern.

For any Gamification mutation capable of changing coins, streak, settings or Protector inventory:

1. begin transaction;
2. lock the `users` row for that user (`SELECT ... FOR UPDATE` or the repository-equivalent);
3. reconcile gamification state as needed;
4. compute balance from ledger;
5. apply reward/spend/inventory/state mutations;
6. commit.

This provides a simple per-user serialization boundary suitable for the expected MVP scale.

Do not use in-memory locks for correctness.

## 14. Partial indexes / SQL-only constraints

The migration should include SQL not representable cleanly in Prisma:

### One eligible Repair candidate

```sql
CREATE UNIQUE INDEX ... ON streak_repairs(user_id)
WHERE status = 'ELIGIBLE';
```

### CHECK constraints

At minimum:

- UserStreak non-negative/current <= longest;
- Daily Goal presets;
- paired pending preset/effective date;
- CoinTransaction amount/type sign;
- inventory quantity non-negative;
- ShopItem cost/max-owned sane;
- StreakRepair lifecycle;
- GamificationLearningEvent allowed event/source types if strict DB validation is retained.

The project already uses SQL CHECKs for lifecycle/state invariants, so Gamification should follow the same convention.

## 15. Migration safety and data compatibility

The migration must be additive where possible.

### Existing learning_days

Preserve all rows.

They may become historical streak input but cannot reconstruct Daily Goal sessions retroactively. Do not invent `GamificationLearningEvent` rows from one `LearningDay` because session cardinality is unknown.

### Existing coin_transactions

Preserve all rows and backfill deterministic legacy idempotency keys.

### Existing inventory/shop data

Preserve it.

Upsert the required Protector by unique `code`; do not delete older catalog records merely because v1 does not expose them.

### Existing streak_challenges

Preserve untouched.

### Initial UserStreak/GamificationSettings rows

Prefer lazy creation on first Gamification read/event, or safe backfill if implementation benefits from it.

If backfilling UserStreak from existing `LearningDay`, only derive what the historical data actually supports. Do not fabricate Protector/Repair history.

## 16. Proposed migration name

Recommended versioned migration:

```text
20260930000000_gamification_v1
```

If implementation begins after another migration lands, use the next chronological repository timestamp rather than forcing this exact name.

## 17. Exact schema delta summary

### Add tables

- `gamification_learning_events`
- `user_streaks`
- `gamification_settings`
- `streak_protection_events`
- `streak_repairs`

### Alter tables

`coin_transactions`:

- add `reference_value`;
- add/backfill `idempotency_key`;
- make idempotency key non-null;
- unique `(user_id, idempotency_key)`;
- add amount/type checks.

Potential hardening:

- `shop_items` checks;
- `user_inventory` quantity check.

### Preserve

- `learning_days`
- `shop_items`
- `user_inventory`
- `streak_challenges`
- `users.timezone`

## 18. Deliberately not persisted

Do not add:

- coin cached balance;
- Daily Goal mutable progress counter;
- milestone-award table;
- fake LearningDays for Protector/Repair;
- Shop UI state;
- current Home card state;
- streak animation state;
- leaderboard/social data;
- vehicle/cosmetic inventory beyond whatever legacy generic catalog schema already supports;
- Streak Challenge v1.1 redesign.

## 19. Validation required before backend coding

Before accepting the actual migration implementation:

1. `prisma format`;
2. `prisma validate`;
3. apply migration to a clean database;
4. apply migration to a database containing existing demo/history rows;
5. verify legacy CoinTransaction backfill;
6. verify all new CHECK constraints;
7. verify eligible-Repair partial unique index;
8. verify Protector inventory cannot go negative or over max through service mutations;
9. verify two concurrent coin spends cannot overdraw;
10. verify same learning source cannot create two GamificationLearningEvents;
11. verify existing Lesson/Review/Unit Challenge migrations remain intact;
12. update `docs/database-schema.md` after the final schema is implemented.

## 20. Implementation handoff

Once this plan is accepted, the first Astra/backend implementation pass should be restricted to:

- Prisma model changes;
- one versioned Gamification v1 migration;
- SQL constraints/indexes;
- Protector seed/upsert support;
- schema/migration tests and validation;
- documentation synchronization.

It should **not yet** implement HTTP routes, Mobile UI or broad Gamification business flows in the same pass.

After the persistence layer is reviewed, implement the Gamification service/repository and learning-domain integrations as the next backend step.
