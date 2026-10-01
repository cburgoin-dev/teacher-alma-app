# Gamification v1 backend

`gamification.rules.ts` owns calendar dates, presets, milestones and continuity calculation. `gamification.repository.ts` owns Prisma persistence. `gamification.service.ts` coordinates reconciliation, rewards, spending and the aggregate. Controller/routes use the existing auth and error envelope. `gamification.types.ts` limits the internal completion boundary to supported durable v1 sources.

## Transactions and integrations

All mutation/read-reconciliation transactions lock `users` first with `SELECT ... FOR UPDATE`, then read the ledger and inventory. No in-memory lock or balance cache exists. Lesson/Review/Unit Challenge repositories expose a Gamification session backed by their existing Prisma transaction, so source completion and rewards commit or roll back together.

- Lesson consolidation emits one event and +3; its first score gives +2 only if nonempty and perfect. Retried completion returns zero new rewards. Ephemeral Replay checks remain read-only and do not contribute to any habit/reward state (explicit compatibility decision).
- Unit Challenge completion emits an event on pass or failure; first durable pass grants +8; only the first completed run can grant the +3 perfect bonus. The final phase keeps its existing persisted response for transport retries.
- Review's signed token already carries a batch UUID and membership; each attempt already persists that UUID. The final authorized item submission checks that every member has an attempt in the batch and emits one event. Correctness is irrelevant to session completion. The final attempt response includes the delta and is stored for retries. No schema change or client completion claim was introduced.
- Lesson and Unit Challenge's real CourseProgress transition gates the lifetime +20 course reward.
- Practice has no integration; its future durable session must be approved before it can emit events.

## Reconciliation

Calendar dates are IANA-local dates derived once from server timestamps. Continuity is computed from real LearningDays, protection events and used Repairs. Only closed local dates can be missed. UserStreak preserves longest and an evaluation watermark; newly purchased inventory never covers an already-evaluated break. Protected and repaired dates are not real study dates. Historical days are usable as continuity evidence but never fabricated into session events/rewards.

The current implementation reads the user's durable history to reconcile continuity, including after Repair; this favors correctness for MVP histories. The persisted state can support a bounded-history optimization later without changing the contract. Transactions have the existing 15-second timeout.

Repair candidates start a 24-hour window at detection; a second uncovered date invalidates them, and used repairs impose a 14-day cooldown. A repair reconnects the prior streak while retaining subsequent real days. It never runs reward evaluation. `status`, `repairedAt` and `coinTransactionId` are updated in one SQL update to satisfy the lifecycle CHECK.

## HTTP

- `GET /me/gamification`: reconciled aggregate, optional Repair candidate UUID.
- `PATCH /me/gamification/timezone`: `{ "timezone": "America/Mazatlan" }`; returns only `{ "timezone": "America/Mazatlan" }`.
- `PATCH /me/gamification/daily-goal`: `{ preset }`; returns `applies`, `effectiveDate`, aggregate and newly earned coins.
- `POST /me/gamification/protectors/purchase`: `{ requestKey }`.
- `POST /me/gamification/streak/repair`: `{ requestKey, repairId }`.

Request keys follow `[a-zA-Z0-9_-]{16,100}` and share a `request:` ledger namespace for spending. The same key cannot purchase and repair, or repair two different candidates. Successful retries do not repeat side effects and return current state. Domain conflicts use HTTP 409, malformed values 400, authentication 401. No client award or arbitrary balance mutation route exists.

Run the existing Protector seed after migrations: `node --import tsx scripts/seed-gamification.ts`. The service requires the active v1 catalog configuration (CONSUMABLE, 50, max 2); it never seeds at request time.

Timezone synchronization requires authentication and uses the same `Intl.DateTimeFormat` IANA validation as learning-date derivation. Empty/non-string/invalid values and offsets such as `UTC-7`, `+07:00`, `-0700` return HTTP 400 / `INVALID_USER_TIMEZONE`. Valid IANA identifiers (including `UTC` and IANA aliases) are retained as supplied. The service takes the existing user-row lock to serialize with completions, skips the update when the value matches, and otherwise updates only User.timezone (plus Prisma's User.updatedAt). It neither initializes nor reconciles Gamification, and never rewrites historical dates, streak state/history, rewards, ledger, inventory, protections or repairs.

Mobile must synchronize the device's current IANA timezone after authentication and at the appropriate app-entry/bootstrap boundary, before fetching Gamification or submitting new learning completions. Repeating the same value is safe; a changed device timezone affects only future event-date derivation. No Mobile implementation is included here.

## Validation

From backend, with the existing local development PostgreSQL configured:

```powershell
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
$env:RUN_GAMIFICATION_DB_TESTS = '1'
node --import tsx --test src/modules/gamification/*.test.ts
$env:RUN_LESSONS_DB_TESTS = '1'
$env:RUN_REVIEW_DB_TESTS = '1'
$env:RUN_UNIT_CHALLENGE_DB_TESTS = '1'
$testFiles = @(rg --files src scripts -g '*.test.ts')
node --import tsx --test @testFiles
node --import tsx scripts/seed-courses-demo.ts --check
git diff --check
```

Tests use injected dates and isolated UUID fixtures. Reset-based demo acceptances remain opt-in and are excluded when no reset is authorized. The integration tests require the Protector catalog seed and never modify the demo learner's state.
