# Logical PostgreSQL model

This document defines the proposed logical relational model for the MVP. It is the bridge between the conceptual domain model and actual PostgreSQL migrations. It should be treated as a strong implementation reference, but not as an immutable production contract.

## General conventions

- PostgreSQL.
- Primary keys use `uuid`.
- Timestamps use `timestamptz`.
- JSON-like flexible configuration uses `jsonb`.
- Avoid storing UI-only state when it can be derived.
- Prefer soft archival/status for published learning content rather than physical deletion.
- Business statuses are stored as `text` plus application validation / database checks rather than PostgreSQL native enums, to keep future evolution easier.
- Foreign-key columns should be indexed where they participate in common joins/lookups.

---

## users

Stores the application user identity/profile data that belongs to the product domain. Authentication credentials remain the responsibility of the selected auth provider.

Columns:

- `id uuid primary key`
- `email text not null unique`
- `display_name text null`
- `timezone text not null default 'UTC'`
- `auth_provider_subject text null unique`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Notes:

- Do not store passwords here if an external auth provider is used.
- `timezone` is needed for streak/day-boundary behavior.
- `auth_provider_subject` keeps auth integration decoupled. If Supabase Auth is chosen later, the application may instead choose to reuse the provider UUID directly.

---

## courses

- `id uuid primary key`
- `title text not null`
- `slug text not null unique`
- `level text null`
- `description text null`
- `cover_url text null`
- `status text not null`
- `position integer not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Recommended statuses:

- `DRAFT`
- `PUBLISHED`
- `COMING_SOON`
- `ARCHIVED`

Constraints / indexes:

- unique `(position)` is not required globally.
- index `(status, position)`.

Notes:

- `level` intentionally remains `text` instead of a strict CEFR enum so future labels such as pre-A1 or custom pathways remain possible.
- Commercial access is not stored directly as course progress state.

---

## topics

- `id uuid primary key`
- `course_id uuid not null references courses(id) on delete restrict`
- `title text not null`
- `description text null`
- `position integer not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints / indexes:

- unique `(course_id, position)`.
- index `(course_id)`.

Notes:

- Published topics should normally be retained; course archival should be preferred over destructive deletion.

---

## lessons

- `id uuid primary key`
- `topic_id uuid not null references topics(id) on delete restrict`
- `title text not null`
- `description text null`
- `position integer not null`
- `is_required boolean not null default true`
- `access_type text not null default 'FREE'`
- `status text not null default 'DRAFT'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Recommended values:

- `access_type`: `FREE`, `PAID`
- `status`: `DRAFT`, `PUBLISHED`, `ARCHIVED`

Constraints / indexes:

- unique `(topic_id, position)`.
- index `(topic_id)`.
- index `(access_type)` if access filtering becomes common.

Notes:

- `PAID` does not mean subscription-only. A paid lesson may be accessible through either Premium membership or permanent ownership of its course.
- Free access is modeled explicitly per lesson so Alma can decide which lessons are free rather than relying on a hardcoded “first N lessons” rule.

---


## unit_challenges

Defines the single Unit Challenge milestone associated with a Topic.

- `id uuid primary key`
- `topic_id uuid not null unique references topics(id) on delete restrict`
- `title text not null`
- `description text null`
- `passing_score integer null`
- `access_type text not null default 'FREE'`
- `status text not null default 'DRAFT'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Recommended values:

- `access_type`: `FREE`, `PAID`
- `status`: `DRAFT`, `PUBLISHED`, `ARCHIVED`

Constraints / indexes:

- unique `(topic_id)`.
- check `passing_score is null or (passing_score between 0 and 100)`.
- index `(access_type)` if access filtering becomes common.
- index `(status)` if publication filtering becomes common.

Notes:

- One-to-one Topic -> Unit Challenge is represented by the unique `topic_id`.
- PostgreSQL cannot conveniently enforce “every learner-facing Topic must have a child Unit Challenge” with a simple FK/check on `topics`; publication/import validation must enforce that Topics exposed through published/available course content have exactly one valid Unit Challenge. This does not require a new `topics.status` column.
- `passing_score = null` means any valid completed run passes for progression. A configured threshold is compared against exact item counts rather than a separately persisted rounded percentage.
- `PAID` uses the existing entitlement/access layer and must not be interpreted as subscription-only.
- Published Unit Challenges should be archived/statused rather than destructively deleted once referenced by run history.

---

## unit_challenge_phases

Ordered authored phase definitions for a Unit Challenge.

- `id uuid primary key`
- `unit_challenge_id uuid not null references unit_challenges(id) on delete restrict`
- `type text not null`
- `position integer not null`
- `config jsonb not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Initial phase types:

- `CONVERSATION`
- `CROSSWORD`

Constraints / indexes:

- unique `(unit_challenge_id, position)`.
- index `(unit_challenge_id)`.
- check/application validation restricts `type` to the supported values for the current implementation.
- `position >= 1`.

Notes:

- Stable identity/order is relational; mechanic-specific authored structure lives in `config jsonb`.
- `CONVERSATION` config contains scene/participants/steps and private correctness metadata for Choice steps.
- `CROSSWORD` config contains width/height plus deterministic entries with canonical answers, clues, direction and coordinates.
- Content validation must reject structurally invalid phase config before publication/seed import.
- Learner-facing GET payloads must sanitize private correctness/canonical-answer fields.

---

## activities

Reusable activity definitions.

- `id uuid primary key`
- `type text not null`
- `prompt text not null`
- `config jsonb not null default '{}'::jsonb`
- `explanation text null`
- `status text not null default 'ACTIVE'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Initial activity types:

- `MULTIPLE_CHOICE`
- `FILL_BLANK_OPTIONS`
- `FILL_BLANK_TEXT`
- `MATCH_WORD_IMAGE`

Notes:

- `config` stores type-specific data such as options, accepted answers, matching pairs, hints and other renderer configuration.
- Reusing a standalone activity entity allows the same activity engine to support lessons, Review and the diagnostic.

---

## lesson_blocks

Ordered content units inside a lesson.

- `id uuid primary key`
- `lesson_id uuid not null references lessons(id) on delete restrict`
- `type text not null`
- `position integer not null`
- `required boolean not null default true`
- `content jsonb not null default '{}'::jsonb`
- `activity_id uuid null references activities(id) on delete restrict`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Initial block types:

- `TEXT`
- `VIDEO`
- `IMAGE`
- `EXAMPLE`
- `ACTIVITY`
- `SUMMARY`

Constraints / indexes:

- unique `(lesson_id, position)`.
- index `(lesson_id)`.
- index `(activity_id)`.
- check conceptually: `type = 'ACTIVITY'` should require `activity_id is not null`; non-activity blocks should normally leave it null.

Notes:

- `content` stores block-specific content/configuration.
- Multiple blocks may later be grouped by the frontend into a single presentation step.

---


## unit_challenge_runs

Durable learner attempt/session for one Unit Challenge.

- `id uuid primary key`
- `user_id uuid not null references users(id) on delete cascade`
- `unit_challenge_id uuid not null references unit_challenges(id) on delete restrict`
- `request_key text not null`
- `status text not null default 'ACTIVE'`
- `passing_score_snapshot integer null`
- `correct_items integer null`
- `total_items integer not null`
- `passed boolean null`
- `started_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `completed_at timestamptz null`
- `abandoned_at timestamptz null`

Statuses:

- `ACTIVE`
- `COMPLETED`
- `ABANDONED`

Constraints / indexes:

- unique `(user_id, unit_challenge_id, request_key)` for start/replay idempotency.
- partial unique index `(user_id, unit_challenge_id) where status = 'ACTIVE'` to enforce at most one live run per learner/challenge.
- index `(unit_challenge_id)`.
- index `(user_id, status)`.
- check `passing_score_snapshot is null or (passing_score_snapshot between 0 and 100)`.
- check `total_items > 0`.
- lifecycle check:
  - `ACTIVE`: `completed_at is null`, `abandoned_at is null`, `correct_items is null`, `passed is null`.
  - `COMPLETED`: `completed_at is not null`, `abandoned_at is null`, `correct_items is not null`, `0 <= correct_items <= total_items`, `passed is not null`.
  - `ABANDONED`: `abandoned_at is not null`, `completed_at is null`, `correct_items is null`, `passed is null`.

Notes:

- A separate persisted percentage is intentionally omitted; percentage is derived from `correct_items / total_items`.
- Threshold comparison should avoid rounded-percentage ambiguity. Conceptually, when a threshold exists, pass if `correct_items * 100 >= passing_score_snapshot * total_items`.
- Run creation must snapshot the authored phase set/order and the configured passing threshold in the same transaction.
- Access is checked before creating/resuming an allowed run. Once an `ACTIVE` run exists, entitlement expiration does not invalidate that run; creating a new replay later revalidates access.
- There is no persisted “current phase” pointer. Resume/current phase is derived as the lowest-position run-phase whose `submitted_at` is null. This avoids pointer/snapshot drift.

---

## unit_challenge_run_phases

Frozen per-run phase snapshot and one-time submission boundary.

- `id uuid primary key`
- `run_id uuid not null references unit_challenge_runs(id) on delete cascade`
- `source_phase_id uuid not null references unit_challenge_phases(id) on delete restrict`
- `position integer not null`
- `type text not null`
- `content_snapshot jsonb not null`
- `answer_data jsonb null`
- `correct_items integer null`
- `total_items integer not null`
- `submission_request_key text null`
- `submission_request_hash text null`
- `submission_response jsonb null`: public response receipt, persisted in the same submission transaction for exact retries even after later progression changes.
- `submitted_at timestamptz null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints / indexes:

- unique `(run_id, position)`.
- unique `(run_id, source_phase_id)`.
- unique `(run_id, submission_request_key)`; PostgreSQL permits multiple null values, so this only constrains submitted/idempotent requests.
- index `(source_phase_id)`.
- index `(run_id, submitted_at, position)`.
- check `position >= 1`.
- check `total_items > 0`.
- check `type in ('CONVERSATION', 'CROSSWORD')` for the v1 implementation.
- submission-state check:
  - before submission: `submitted_at is null`, `answer_data is null`, `correct_items is null`, `submission_request_key is null`, `submission_request_hash is null`;
  - after submission: `submitted_at is not null`, `answer_data is not null`, `correct_items is not null`, `0 <= correct_items <= total_items`, `submission_request_key is not null`, `submission_request_hash is not null`.

Notes:

- `content_snapshot` is authoritative for an already-started/historical run; later edits to authored phase config do not affect it.
- Snapshot content may include private validation data because it is server persistence. Public APIs must sanitize it.
- One row represents one phase, not one individual evaluable item. Conversation choices/crossword entries remain inside the snapshot/answer JSONB because v1 does not require independent item lifecycle/querying.
- Phase submission is one-time. The service should row-lock this record, use `submission_request_key` + payload hash for transport idempotency, return the existing accepted result for an exact retry, and reject a conflicting key/payload or a new submission after the phase is already final.
- v1 persistence is phase-granular: partially filled Crossword cells or intermediate Conversation choices are Mobile-local until the phase is submitted. An interrupted run resumes at the first unsubmitted phase, which may restart that phase's local interaction.
- Immediate correctness detail must not be returned to Mobile; aggregate scoring remains server-side until Result.

---

## unit_challenge_progress

Consolidated progression completion for a Unit Challenge.

- `id uuid primary key`
- `user_id uuid not null references users(id) on delete cascade`
- `unit_challenge_id uuid not null references unit_challenges(id) on delete restrict`
- `passed_run_id uuid not null unique references unit_challenge_runs(id) on delete restrict`
- `completed_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints / indexes:

- unique `(user_id, unit_challenge_id)`.
- index `(unit_challenge_id)`.
- index `(user_id)`.

Notes:

- Absence means the challenge has not yet been passed for progression.
- Creation must occur atomically with completion of the first qualifying run.
- The service transaction must verify that `passed_run_id` belongs to the same `user_id` and `unit_challenge_id`, is `COMPLETED` and has `passed = true`. This mirrors existing progress/run patterns; a simple single-column FK does not encode all same-owner/same-content invariants.
- Later replays do not replace/delete this row and cannot revoke progression.

---

## course_progress

Tracks whether a learner has started/completed a course.

- `id uuid primary key`
- `user_id uuid not null references users(id) on delete cascade`
- `course_id uuid not null references courses(id) on delete restrict`
- `status text not null`
- `started_at timestamptz not null default now()`
- `completed_at timestamptz null`
- `updated_at timestamptz not null default now()`

Statuses:

- `IN_PROGRESS`
- `COMPLETED`

Constraints / indexes:

- unique `(user_id, course_id)`.
- index `(user_id, status)`.
- index `(course_id)`.

Notes:

- No row means `NOT_STARTED`.

---

## lesson_progress

Tracks consolidated completion for a lesson.

- `id uuid primary key`
- `user_id uuid not null references users(id) on delete cascade`
- `lesson_id uuid not null references lessons(id) on delete restrict`
- `status text not null`
- `completed_run_id uuid null unique references lesson_runs(id) on delete restrict`
- `started_at timestamptz not null default now()`
- `completed_at timestamptz null`
- `updated_at timestamptz not null default now()`

Statuses:

- `COMPLETED`

Constraints / indexes:

- unique `(user_id, lesson_id)`.
- index `(user_id, status)`.
- index `(lesson_id)`.

Notes:

- No row means `NOT_STARTED`.
- Only successful run completion writes this record.

---

## lesson_block_progress

Tracks consolidated required and optional blocks from completed runs. This table is necessary to avoid inferring completion only from the current block pointer.

- `id uuid primary key`
- `user_id uuid not null references users(id) on delete cascade`
- `lesson_block_id uuid not null references lesson_blocks(id) on delete restrict`
- `status text not null`
- `completed_at timestamptz null`
- `updated_at timestamptz not null default now()`

Statuses:

- `CURRENT`
- `COMPLETED`

Constraints / indexes:

- unique `(user_id, lesson_block_id)`.
- index `(user_id)`.
- index `(lesson_block_id)`.

Notes:

- Absence means not visited.
- Activity correctness remains separate from block completion.

---

## activity_attempts

Stores attempts made in normal lesson/review contexts.

- `id uuid primary key`
- `user_id uuid not null references users(id) on delete cascade`
- `activity_id uuid not null references activities(id) on delete restrict`
- `lesson_id uuid null references lessons(id) on delete restrict`
- `run_id uuid null references lesson_runs(id) on delete restrict`
- `review_item_id uuid null`
- `context text not null`
- `answer_data jsonb not null`
- `is_correct boolean not null`
- `attempt_number integer not null default 1`
- `created_at timestamptz not null default now()`

Initial contexts:

- `LESSON`
- `REVIEW`
- `ASSESSMENT`

Indexes:

- `(user_id, activity_id, created_at desc)`.
- `(lesson_id)`.

Notes:

- The FK from `review_item_id` is added after `review_items` is created to avoid creation-order problems.
- Diagnostic answers are modeled separately because they belong to a specific diagnostic attempt/question definition and use deferred feedback.

---

## review_items

Represents learning items that need reinforcement after incorrect attempts.

- `id uuid primary key`
- `user_id uuid not null references users(id) on delete cascade`
- `activity_id uuid not null references activities(id) on delete restrict`
- `source_lesson_id uuid null references lessons(id) on delete restrict`
- `status text not null default 'ACTIVE'`
- `incorrect_attempts integer not null default 1`
- `last_reviewed_at timestamptz null`
- `resolved_at timestamptz null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Statuses:

- `ACTIVE`
- `RESOLVED`

Constraints / indexes:

- index `(user_id, status)`.
- partial unique index recommended: one active item per `(user_id, activity_id)` where `status = 'ACTIVE'`.

After this table exists:

- `activity_attempts.review_item_id` references `review_items(id) on delete set null`.

---

## diagnostics

Defines a diagnostic version/question set. Keeping a versioned definition prevents later content edits from making historical attempts ambiguous.

- `id uuid primary key`
- `title text not null`
- `version integer not null`
- `status text not null default 'DRAFT'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints:

- unique `(version)` for the initial single diagnostic lineage.

Statuses:

- `DRAFT`
- `ACTIVE`
- `ARCHIVED`

---

## diagnostic_questions

Maps reusable activities into a diagnostic definition.

- `id uuid primary key`
- `diagnostic_id uuid not null references diagnostics(id) on delete restrict`
- `activity_id uuid not null references activities(id) on delete restrict`
- `position integer not null`
- `weight numeric(6,3) not null default 1`
- `target_level text null`
- `created_at timestamptz not null default now()`

Constraints / indexes:

- unique `(diagnostic_id, position)`.
- unique `(diagnostic_id, activity_id)` unless reuse of the same activity twice becomes intentional.
- index `(diagnostic_id)`.

Notes:

- `weight` and `target_level` leave room for simple placement scoring without requiring an adaptive engine.

---

## diagnostic_attempts

- `id uuid primary key`
- `user_id uuid not null references users(id) on delete cascade`
- `diagnostic_id uuid not null references diagnostics(id) on delete restrict`
- `status text not null`
- `internal_score numeric(8,3) null`
- `recommended_level text null`
- `recommended_course_id uuid null references courses(id) on delete set null`
- `strengths jsonb null`
- `reinforcement_areas jsonb null`
- `started_at timestamptz not null default now()`
- `completed_at timestamptz null`

Statuses:

- `IN_PROGRESS`
- `COMPLETED`
- `ABANDONED`

Indexes:

- `(user_id, started_at desc)`.
- `(diagnostic_id)`.

Notes:

- Multiple attempts are intentionally supported.
- Learner-facing strengths/reinforcement may be persisted as a snapshot so later changes to scoring rules do not silently rewrite old results.

---

## diagnostic_answers

- `id uuid primary key`
- `diagnostic_attempt_id uuid not null references diagnostic_attempts(id) on delete cascade`
- `diagnostic_question_id uuid not null references diagnostic_questions(id) on delete restrict`
- `answer_data jsonb not null`
- `is_correct boolean not null`
- `created_at timestamptz not null default now()`

Constraints / indexes:

- unique `(diagnostic_attempt_id, diagnostic_question_id)` for one submitted answer per question in the initial flow.
- index `(diagnostic_attempt_id)`.

---

## learning_days

Represents a valid local-calendar learning day used to derive streaks and weekly consistency.

- `id uuid primary key`
- `user_id uuid not null references users(id) on delete cascade`
- `activity_date date not null`
- `created_at timestamptz not null default now()`

Constraints:

- unique `(user_id, activity_date)`.

Indexes:

- `(user_id, activity_date desc)`.

Notes:

- What exact event qualifies a date as a learning day is a business-rule/service concern and can evolve without changing this table.
- Gamification v1 keeps current/longest state in `user_streaks`; these rows remain evidence of real learning. Protector and Repair never fabricate a LearningDay.
- Historical LearningDays are preserved without synthesizing session events: their session cardinality is unknown.

---

## gamification_learning_events

One durable row per qualifying completed session; the source identity is deliberately polymorphic (no FK to individual learning domains).

- `id uuid primary key`
- `user_id uuid not null references users(id) on delete cascade`
- `event_type text not null`: CHECK in `LESSON_COMPLETION | LESSON_REPLAY_COMPLETION | UNIT_CHALLENGE_COMPLETION | REVIEW_COMPLETION | PRACTICE_COMPLETION`.
- `source_type text not null`: CHECK in `LESSON_RUN | UNIT_CHALLENGE_RUN | REVIEW_BATCH | PRACTICE_SESSION`.
- `source_id uuid not null`
- `learning_date date not null`: durable local date derived from the applicable user timezone.
- `occurred_at timestamptz not null`
- `created_at timestamptz not null default now()`
- Unique `(user_id, source_type, source_id)`.
- Indexes `(user_id, learning_date)`, `(user_id, occurred_at desc)`.

Daily Goal progress is derived from the count of these events per local date; no mutable progress counter is stored.

---

## user_streaks

Compact authoritative current/longest state, backed by real learning days and protection/repair history.

- `user_id uuid primary key references users(id) on delete cascade`
- `current_days integer not null default 0`
- `longest_days integer not null default 0`
- `last_learning_date date null`
- `continuity_through date null`: includes accepted Protector/Repair coverage.
- `last_evaluated_date date null`
- `updated_at timestamptz not null default now()` (Prisma updates on mutation).
- CHECK: `current_days >= 0`, `longest_days >= 0`, `longest_days >= current_days`.

Protected/repaired dates preserve continuity without adding real learning days to the count. This migration does not backfill streak state; lazy initialization belongs to the next service pass.

---

## gamification_settings

- `user_id uuid primary key references users(id) on delete cascade`
- `daily_goal_preset text not null default 'NORMAL'`
- `pending_daily_goal_preset text null`
- `pending_effective_date date null`
- `updated_at timestamptz not null default now()` (Prisma updates on mutation).
- CHECK: current and non-null pending presets in `CASUAL | NORMAL | INTENSE`.
- CHECK: pending preset and effective date are both null or both non-null.

Rows are not eagerly backfilled; service initialization is deferred.

---

## coin_transactions

Immutable ledger for coin earnings/spending. Balance remains `sum(amount)`; no mutable balance/cache is stored.

- `id uuid primary key`
- `user_id uuid not null references users(id) on delete cascade`
- `amount integer not null`
- `type text not null`
- `reason text not null` (intentionally extensible; no reason CHECK).
- `reference_type text null`
- `reference_id uuid null`
- `reference_value text null` (for example a learning date or milestone threshold).
- `idempotency_key text not null`
- `created_at timestamptz not null default now()`
- Unique `(user_id, idempotency_key)`.
- Index `(user_id, created_at desc)`.
- CHECK: nonzero amount; only `CREDIT` with positive amount or `DEBIT` with negative amount.

Migration `20260930000000_gamification_v1` backfills every existing row with `legacy:<transaction-id>` before enforcing NOT NULL/uniqueness. Older documented `EARN/SPEND` types are normalized to `CREDIT/DEBIT`; ids, amounts, reasons, references and timestamps remain intact. Unsupported types or inconsistent signs fail the transactional migration rather than silently rewriting monetary history.

Examples: `+3 / CREDIT / LESSON_FIRST_COMPLETION`, `-50 / DEBIT / STREAK_PROTECTOR_PURCHASE`, `-120 / DEBIT / STREAK_REPAIR`.

---

## shop_items

Reusable catalog; existing legacy items are preserved.

- `id uuid primary key`
- `code text not null unique`
- `name text not null`
- `description text null`
- `item_type text not null`
- `coin_cost integer not null`
- `max_owned integer null`
- `config jsonb not null default '{}'::jsonb`
- `active boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- CHECK: `coin_cost >= 0`; `max_owned IS NULL OR max_owned > 0`.

The only v1 seed is `STREAK_PROTECTOR`: `CONSUMABLE`, 50 coins, maxOwned 2, active. Run `node --import tsx scripts/seed-gamification.ts` (or `npm run seed:gamification`) from backend after migrating. It upserts by code, preserves the row id and existing name/description/config, and does not delete older catalog items or inventory.

---

## user_inventory

For inventory-backed items such as Streak Protectors.

- `id uuid primary key`
- `user_id uuid not null references users(id) on delete cascade`
- `shop_item_id uuid not null references shop_items(id) on delete restrict`
- `quantity integer not null default 0`
- `updated_at timestamptz not null default now()`
- Unique `(user_id, shop_item_id)`.
- Index `(shop_item_id)`.
- CHECK `quantity >= 0` (already enforced by the initial migration).

The cross-table stock cap and atomic balance/inventory changes belong to the subsequent service pass.

---

## streak_protection_events

Evidence of automatic Protector consumption; does not create a LearningDay or coin transaction.

- `id uuid primary key`
- `user_id uuid not null references users(id) on delete cascade`
- `shop_item_id uuid not null references shop_items(id) on delete restrict`
- `protected_date date not null`
- `created_at timestamptz not null default now()`
- Unique `(user_id, protected_date)`.
- Index `(shop_item_id)`.

---

## streak_repairs

Contextual recovery candidate/history, never inventory.

- `id uuid primary key`
- `user_id uuid not null references users(id) on delete cascade`
- `broken_date date not null`
- `previous_streak_days integer not null`
- `eligible_until timestamptz not null`
- `status text not null default 'ELIGIBLE'`
- `repaired_at timestamptz null`
- `coin_transaction_id uuid null unique references coin_transactions(id) on delete restrict`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()` (Prisma updates on mutation).
- Index `(user_id, created_at desc)`.
- Partial unique index `streak_repairs_one_eligible` on `(user_id) WHERE status = 'ELIGIBLE'`.
- CHECK: `previous_streak_days > 0`; `eligible_until > created_at`.
- CHECK: `USED` requires both repaired_at and coin_transaction_id; `ELIGIBLE/INVALIDATED` require both null. Other statuses are rejected.

Expiration is derived from eligible_until; the 24-hour eligibility policy, 14-day cooldown and ledger attribution are service responsibilities. CHECK constraints and the partial index live in migration SQL, not Prisma enums.

---

## streak_challenges

Stores the lifecycle of a purchased/activated streak challenge.

- `id uuid primary key`
- `user_id uuid not null references users(id) on delete cascade`
- `shop_item_id uuid not null references shop_items(id) on delete restrict`
- `status text not null`
- `started_on date not null`
- `ends_on date not null`
- `entry_cost integer not null`
- `reward_amount integer not null`
- `completed_at timestamptz null`
- `created_at timestamptz not null default now()`

Statuses:

- `ACTIVE`
- `COMPLETED`
- `FAILED`

Constraints / indexes:

- check `ends_on >= started_on`.
- index `(user_id, status)`.
- partial unique index recommended to allow at most one `ACTIVE` challenge per user.

Notes:

- `entry_cost` and `reward_amount` are snapshotted on creation so future economy changes do not alter an already-started challenge.

---

## products

Commercial products available through app-store billing / future providers.

- `id uuid primary key`
- `type text not null`
- `course_id uuid null references courses(id) on delete restrict`
- `code text not null unique`
- `active boolean not null default true`
- `provider_product_ids jsonb not null default '{}'::jsonb`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Initial types:

- `SUBSCRIPTION`
- `COURSE_PURCHASE`

Constraints:

- `COURSE_PURCHASE` should require `course_id is not null`.
- `SUBSCRIPTION` should normally have `course_id is null`.

Notes:

- Actual localized store pricing remains provider-driven/configurable and is intentionally not embedded as a core schema assumption.

---

## purchases

Records validated commercial transactions / subscription purchase records received from billing providers.

- `id uuid primary key`
- `user_id uuid not null references users(id) on delete cascade`
- `product_id uuid not null references products(id) on delete restrict`
- `provider text not null`
- `external_transaction_id text not null`
- `status text not null`
- `purchased_at timestamptz not null`
- `expires_at timestamptz null`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints / indexes:

- unique `(provider, external_transaction_id)`.
- index `(user_id, status)`.
- index `(product_id)`.

Possible statuses:

- `PENDING`
- `VALIDATED`
- `CANCELLED`
- `REFUNDED`
- `EXPIRED`

Notes:

- Provider/store state remains authoritative for real-money purchases; this table stores validated local history/snapshots.

---

## entitlements

Canonical application-level access grants. Access checks should query valid entitlements rather than a local `isPremium` flag.

- `id uuid primary key`
- `user_id uuid not null references users(id) on delete cascade`
- `scope text not null`
- `course_id uuid null references courses(id) on delete restrict`
- `source_purchase_id uuid null references purchases(id) on delete set null`
- `status text not null`
- `starts_at timestamptz not null`
- `expires_at timestamptz null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Scopes:

- `ALL_COURSES`
- `COURSE`

Statuses:

- `ACTIVE`
- `EXPIRED`
- `REVOKED`

Constraints / indexes:

- `COURSE` scope requires `course_id is not null`.
- `ALL_COURSES` should normally have `course_id is null`.
- index `(user_id, status, expires_at)`.
- index `(course_id)`.

Access rule conceptually:

1. If lesson `access_type = FREE`, allow.
2. Otherwise determine its course.
3. Allow if user has a valid `COURSE` entitlement for that course.
4. Otherwise allow if user has a valid `ALL_COURSES` entitlement.
5. Otherwise return access-locked.

Permanent course purchase:

- entitlement scope `COURSE`
- `expires_at = null`

Premium subscription:

- entitlement scope `ALL_COURSES`
- expiration mirrors validated subscription access.

---

# Key relationship summary

```text
users 1---N course_progress N---1 courses
users 1---N lesson_progress N---1 lessons
users 1---N lesson_block_progress N---1 lesson_blocks
users 1---N unit_challenge_runs N---1 unit_challenges
users 1---N unit_challenge_progress N---1 unit_challenges

courses 1---N topics
topics 1---N lessons 1---N lesson_blocks
topics 1---1 unit_challenges 1---N unit_challenge_phases
unit_challenges 1---N unit_challenge_runs 1---N unit_challenge_run_phases
lesson_blocks N---0..1 activities

users 1---N activity_attempts N---1 activities
users 1---N review_items N---1 activities

activities 1---N diagnostic_questions N---1 diagnostics
users 1---N diagnostic_attempts N---1 diagnostics
diagnostic_attempts 1---N diagnostic_answers N---1 diagnostic_questions

users 1---N gamification_learning_events
users 1---0..1 user_streaks
users 1---0..1 gamification_settings
users 1---N streak_protection_events N---1 shop_items
users 1---N streak_repairs 0..1---0..1 coin_transactions
users 1---N learning_days
users 1---N coin_transactions
users 1---N user_inventory N---1 shop_items
users 1---N streak_challenges N---1 shop_items

courses 1---N products (for course-purchase products)
users 1---N purchases N---1 products
users 1---N entitlements
purchases 1---N/0..N entitlements
```

---

# Delete policy summary

Use destructive cascades mainly for private user-owned history when an account is deleted:

- user -> progress/attempts/review/diagnostics/Unit-Challenge runs/gamification/commercial local records: `ON DELETE CASCADE` where legally/product-wise appropriate.

Use `RESTRICT` for published/shared learning content referenced by history:

- course/topic/lesson/block/activity/unit-challenge/phase deletion should normally be prevented once referenced.
- prefer `ARCHIVED` / inactive status instead of deleting published content.

Use `SET NULL` where historical records remain useful even if a recommendation/source link is no longer active:

- diagnostic recommended course.
- entitlement source purchase.
- review-attempt contextual link where appropriate.

---

# Important derived data (do not persist as primary source of truth)

Initially derive rather than store:

- Home state (`NEW`, `ASSESSED`, `ACTIVE`, etc.).
- current coin balance (`sum(coin_transactions.amount)`).
- Daily Goal progress from `gamification_learning_events`; current/longest streak is persisted in `user_streaks` with learning/protection/repair history.
- course/roadmap progress percentage from required progression nodes (required Lessons plus required Unit Challenge milestones), using one consistent API denominator.
- Unit Challenge percentage from persisted correct/total item counts.
- lesson score/result variant from attempts/review data.
- Premium boolean from current valid entitlements.
- locked/unlocked/current UI state from learning progression + access + entitlements; Unit Challenge adds a node type, not a parallel persisted state system.

Caching/denormalization can be added later if actual performance requires it.

---

# Deliberately deferred from the MVP schema

Do not add yet unless implementation requirements make them necessary:

- social/friends/followers.
- rankings/leagues.
- complex achievements system.
- cosmetics/avatar inventory.
- challenge mechanics beyond Unit Challenge v1 `CONVERSATION` / `CROSSWORD` (for example Sentence Builder, Listening Challenge or unrelated minigames).
- spaced-repetition scheduling beyond current Review lifecycle.
- AI-generated-content audit tables.
- advanced analytics/event warehouse.
- admin-panel-specific persistence.
- notification delivery tables.

---

# Schema-freeze assessment

This logical model is considered sufficiently concrete to proceed to actual PostgreSQL migrations, subject to implementation validation.

The main implementation decisions that remain provider-specific rather than schema-blocking are:

- final authentication provider.
- billing provider/integration details.
- media/video provider.
- exact prices/rewards/economy values.

Any future change should preferably occur through versioned migrations rather than manual database edits.


---

# Lessons Content Contract v2 — schema compatibility

The planned richer lesson/content payloads are intentionally compatible with the current schema.

No migration is required solely for:

- structured TEXT segments/emphasis;
- EXAMPLE dialogue variants and turns;
- optional audio URLs/metadata;
- structured activity presentation context;
- richer SUMMARY takeaways/key phrases;
- demo content/media references.

These values fit the existing:

- `lesson_blocks.content jsonb`
- `activities.config jsonb`

The backend should validate/sanitize their shapes before exposing them publicly.

Likewise, Summary activity-completion counts and Result course metadata should be derived from existing lesson/activity/course records when possible rather than persisted as UI-specific columns.

Only introduce new tables/columns later if real operational requirements justify them.


## LessonRun schema and migration

`20260925000000_lesson_runs` creates:

- `lesson_runs`: UUID PK; user/lesson FKs; text request_key/status; nullable block FK; timestamptz started_at, updated_at, completed_at, abandoned_at; nullable integer correct_answers/total_activities.
- Unique (user_id, lesson_id, request_key) deduplicates one entry request. A PostgreSQL partial unique index on (user_id, lesson_id) WHERE status = 'ACTIVE' enforces one live run. User-row locking serializes mutations.
- Lifecycle CHECK enforces ACTIVE with no outcome, COMPLETED with timestamp and score/no pointer, ABANDONED with abandoned timestamp/no score/no pointer. Score CHECK requires 0 <= correct_answers <= total_activities.
- `lesson_run_block_progress`: composite PK (run_id, lesson_block_id), completed_at; run FK cascades, block FK restricts.
- `activity_attempts.run_id`: nullable FK with delete restrict; unique (run_id, activity_id, attempt_number); non-null run requires LESSON context and lesson_id. New normal submissions always supply run_id; other contexts remain nullable.
- `lesson_progress.completed_run_id`: nullable unique FK with delete restrict. Status CHECK allows only COMPLETED. The old current_block_id is removed.

Backfill is transactional: one legacy run per user/lesson found in progress, LESSON attempts or block traversal. Completed progress becomes a COMPLETED run with a first-attempt score snapshot; unfinished history becomes ABANDONED. Attempts are attached and renumbered per run/activity in original attempt/created/id order. Traversal is copied into run rows. Only unfinished durable progress/block rows are removed; completed records remain linked. Legacy Review is preserved because its provenance cannot be reconstructed reliably; it is not retroactively decremented. New ACTIVE/ABANDONED runs never produce Review. No database reset is used by the migration.

## Review v1 schema adjustments required before implementation

The accepted semantics are defined in `docs/review-semantics-v1.md`.

The earlier recommendation of a partial unique index for only ACTIVE ReviewItems is superseded for Review v1. Review reuses/reactivates the same lifecycle row, therefore the implementation should enforce:

- unique `(user_id, activity_id)` on `review_items`.

This prevents a RESOLVED historical row and a new ACTIVE duplicate for the same user/activity.

Review submissions also require durable request idempotency. Add the smallest schema support necessary so one logical Review submission request cannot create two `activity_attempts` or apply the ReviewItem transition twice after a transport retry. The final field/index shape should remain scoped to Review attempts and must not weaken the existing LessonRun attempt uniqueness.

No `review_sessions` or `review_session_items` table is required for Review v1. A Review batch is short-lived and authorized by an opaque token returned at batch start.



## Unit Challenge v1 schema additions required before implementation

The accepted semantics are defined in `docs/unit-challenge-semantics-v1.md`.

The backend implementation should add a versioned migration for:

- `unit_challenges`;
- `unit_challenge_phases`;
- `unit_challenge_runs`;
- `unit_challenge_run_phases`;
- `unit_challenge_progress`.

Implementation requirements:

- Add the corresponding Prisma models/relations while preserving the repository convention of text statuses plus SQL CHECK constraints.
- Use a PostgreSQL partial unique index to enforce at most one `ACTIVE` run per `(user_id, unit_challenge_id)`; Prisma schema alone cannot express that partial index.
- Keep phase content/config/snapshots in JSONB but validate their discriminated shapes in application/content-import code.
- Start-run creation, run-phase snapshots and `total_items` calculation must be transactional.
- Phase submission must row-lock the run/run-phase as needed, enforce ordered traversal, and be idempotent under network retry.
- The mutation that submits the final pending phase should also finalize the run and, when qualifying, create `unit_challenge_progress` / advance course progression in the same transaction. Failure rolls back the submission and progression side effects together.
- `ABANDONED` runs never create progression.
- Do not add Unit Challenge answers to `activity_attempts` or Unit Challenge mistakes to `review_items` in v1.
- Do not persist route geometry, bus coordinates or animation history. Those remain Mobile presentation derived from roadmap/progression data.

### Publication/content validation

Database constraints protect structural relationships, but publication/import validation must additionally ensure:

- every Topic exposed through published/available course content has exactly one valid Unit Challenge;
- a published Unit Challenge has at least one phase and all phase positions are contiguous/ordered according to the import contract;
- `CONVERSATION` has at least one evaluable Choice and exactly one correct option per Choice in v1;
- `CROSSWORD` entries fit the declared grid, have non-empty canonical answers, valid `ACROSS|DOWN` directions, unique ids and compatible crossing letters;
- challenge `total_items` computed at run start is greater than zero.

No admin/CMS tables are introduced for this validation.
