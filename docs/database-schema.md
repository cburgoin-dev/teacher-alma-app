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

Tracks overall progress/resume state for a lesson.

- `id uuid primary key`
- `user_id uuid not null references users(id) on delete cascade`
- `lesson_id uuid not null references lessons(id) on delete restrict`
- `status text not null`
- `current_block_id uuid null references lesson_blocks(id) on delete restrict`
- `started_at timestamptz not null default now()`
- `completed_at timestamptz null`
- `updated_at timestamptz not null default now()`

Statuses:

- `IN_PROGRESS`
- `COMPLETED`

Constraints / indexes:

- unique `(user_id, lesson_id)`.
- index `(user_id, status)`.
- index `(lesson_id)`.

Notes:

- No row means `NOT_STARTED`.
- `current_block_id` supports resume, but is not sufficient alone to prove lesson completion.

---

## lesson_block_progress

Tracks which required blocks a learner has traversed/completed. This table is necessary to avoid inferring completion only from the current block pointer.

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
- Streak values should be derived from these rows initially rather than maintained as a single mutable counter.

---

## coin_transactions

Immutable ledger for coin earnings/spending.

- `id uuid primary key`
- `user_id uuid not null references users(id) on delete cascade`
- `amount integer not null`
- `type text not null`
- `reason text not null`
- `reference_type text null`
- `reference_id uuid null`
- `created_at timestamptz not null default now()`

Examples:

- `+20 / EARN / LESSON_COMPLETED`
- `+5 / EARN / PERFECT_BONUS`
- `-400 / SPEND / STREAK_SHIELD_PURCHASE`
- `+150 / EARN / STREAK_CHALLENGE_REWARD`

Indexes:

- `(user_id, created_at desc)`.

Notes:

- The ledger is the source of truth. Current balance may initially be derived with `sum(amount)` and cached later only if needed.
- `reference_type/reference_id` is intentionally generic audit metadata; important domain links should still exist in their own tables.

---

## shop_items

Configurable items/actions shown in the coin shop.

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

Initial codes:

- `STREAK_SHIELD`
- `SEVEN_DAY_CHALLENGE`

Notes:

- Prices are configuration, not schema.
- `SEVEN_DAY_CHALLENGE` is an activatable shop action rather than an inventory quantity.

---

## user_inventory

For inventory-backed items such as streak shields.

- `id uuid primary key`
- `user_id uuid not null references users(id) on delete cascade`
- `shop_item_id uuid not null references shop_items(id) on delete restrict`
- `quantity integer not null default 0`
- `updated_at timestamptz not null default now()`

Constraints:

- unique `(user_id, shop_item_id)`.
- check `quantity >= 0`.

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

courses 1---N topics 1---N lessons 1---N lesson_blocks
lesson_blocks N---0..1 activities

users 1---N activity_attempts N---1 activities
users 1---N review_items N---1 activities

activities 1---N diagnostic_questions N---1 diagnostics
users 1---N diagnostic_attempts N---1 diagnostics
diagnostic_attempts 1---N diagnostic_answers N---1 diagnostic_questions

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

- user -> progress/attempts/review/diagnostics/gamification/commercial local records: `ON DELETE CASCADE` where legally/product-wise appropriate.

Use `RESTRICT` for published/shared learning content referenced by history:

- course/topic/lesson/block/activity deletion should normally be prevented once referenced.
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
- current streak / longest streak from `learning_days`.
- course progress percentage from required lesson completion.
- lesson score/result variant from attempts/review data.
- Premium boolean from current valid entitlements.
- locked/unlocked UI state from lesson access + progression + entitlements.

Caching/denormalization can be added later if actual performance requires it.

---

# Deliberately deferred from the MVP schema

Do not add yet unless implementation requirements make them necessary:

- social/friends/followers.
- rankings/leagues.
- complex achievements system.
- cosmetics/avatar inventory.
- minigames.
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


## Planned LessonRun schema evolution

The accepted session model in `docs/lesson-session-semantics-v1.md` requires an explicit migration before implementation is considered complete.

Expected relational direction:

- add `lesson_runs` with user, lesson, lifecycle status, current run pointer and lifecycle timestamps;
- associate normal lesson `activity_attempts` with the originating run;
- persist run-specific block traversal separately when required for required/optional-step correctness;
- keep durable `lesson_progress` / `lesson_block_progress` as consolidated learner state rather than transient run state.

An ABANDONED run must not contribute to durable score, Review, progression or rewards. A COMPLETED run is consolidated atomically and idempotently.

The exact constraints/indexes and migration/backfill strategy are implementation details to finalize in the Lessons Session Semantics v1 coding iteration. Replay v1 remains read-only and does not require a run row.
