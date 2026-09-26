# Review v1 backend

Endpoints: GET /review, POST /review/batches, POST /review/items/:reviewItemId/attempt.
Authentication uses the existing trusted application boundary.

- Batch authorization uses AES-256-GCM, a random nonce, domain-specific authenticated
  data and a 15-minute lifetime. Claims bind user, ordered item ids, activity ids
  and source lesson ids. Configure REVIEW_BATCH_SECRET as 64 random hex characters,
  identical on all server instances. Development alone may omit it and use an
  ephemeral process key (restart invalidates outstanding batches).
- Request keys use the existing Lessons convention: 16–100 ASCII letters, digits,
  underscore or hyphen. A unique nullable (userId, reviewRequestKey) on ActivityAttempt
  guarantees durable per-user uniqueness without affecting Lesson attempt uniqueness.
  A SHA-256 hash of the canonical request (including token, item, answer and any
  extra payload fields) detects incompatible reuse. Conflicts return
  400 INVALID_REVIEW_REQUEST_KEY. The committed JSON response is stored with the
  attempt, so retries preserve feedback and the original pending count even after
  later transitions. Tokens must still be valid for retries.
- Each newly issued token includes a random batch UUID. Migration
  20260926010000_review_batch_submission adds nullable reviewBatchId to attempts
  and unique (reviewItemId, reviewBatchId). Under the existing user-row lock,
  idempotent request lookup precedes the consumed-batch check. A new requestKey
  for an already answered ACTIVE item/batch returns 403 REVIEW_BATCH_INVALID;
  a RESOLVED item still returns 409 REVIEW_ITEM_NOT_ACTIVE. A later batch has a
  new UUID and permits another submission. No session table is needed.
  Pre-fix tokens without a batch UUID are invalidated; historical attempts remain
  unchanged with a null batch id.
- All writes acquire the same PostgreSQL user-row lock as Lessons. Attempt numbering,
  state validation, lifecycle update, response snapshot and attempt insert share one
  transaction. GET and batch creation use database-enforced read-only transactions.
  Current entitlement is used for the response's global pending count, never to gate
  submission of an item authorized by the token.
- Items without a source lesson, with inactive activities, or with unpublished
  lessons/courses are omitted from eligibility. No prerequisite lock is applied.
- Migration 20260926000000_review_v1 retains the oldest row per user/activity.
  It sums historical incorrect counters, keeps the latest review/update timestamps,
  lets ACTIVE win, clears resolvedAt for ACTIVE and retains the latest resolution
  otherwise. It retains the earliest non-null source lesson. Every linked attempt
  moves to the retained row; historical Review attempt numbers are made sequential
  by createdAt/id. Lesson attempt numbers and their unique constraint are untouched.
  No attempts are deleted and no session tables are introduced.

Validation (from backend, with the existing local demo environment):
- node node_modules/prisma/build/index.js validate
- node node_modules/prisma/build/index.js generate
- node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
- RUN_REVIEW_DB_TESTS=1 and RUN_LESSONS_DB_TESTS=1 enable PostgreSQL integration tests.
  Tests require localhost:5433/teacher_alma_dev and development mode, use isolated
  fixture IDs, and remove only their own data. Migration tests use disposable schemas.
