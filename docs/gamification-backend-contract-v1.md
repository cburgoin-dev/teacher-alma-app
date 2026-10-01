# Gamification backend contract v1

**Status:** backend v1 implemented; Mobile integration deferred
**Scope:** Gamification v1  
**Branch:** `feature/gamification-v1`  
**Product source of truth:** `docs/gamification-semantics-v1.md`

This document translates the approved Gamification v1 product semantics into backend/domain requirements. It is implementation-facing: entities, invariants, idempotency, integration points and HTTP contracts.

Compatibility decision: Lesson Replay remains ephemeral/read-only and is excluded from qualifying events in v1. No Replay persistence or LessonRun reuse is introduced. Practice remains deferred until a durable session exists.

It does **not** authorize scope expansion. When this document and product semantics disagree, product semantics win.

## 1. Goals

Gamification v1 must support:

- one daily streak based on qualifying completed learning sessions;
- Daily Goal progress based on completed sessions, not internal Activities;
- auditable coins;
- Streak Protector purchase and automatic consumption;
- contextual Streak Repair;
- first-time progression rewards;
- perfect-first-result bonuses;
- lifetime-unique streak milestone rewards;
- backend-authoritative state for Home, Results, Progress, Profile and nested Shop/protection UI.

The design must remain small, deterministic and safe under retries/concurrent requests.

## 2. Existing schema and migration direction

The repository already contains these related models:

- `LearningDay`
- `CoinTransaction`
- `ShopItem`
- `UserInventory`
- `StreakChallenge`
- `User.timezone`

Reuse what still matches the new semantics rather than replacing it gratuitously.

### 2.1 Keep

#### `LearningDay`

Keep as durable evidence that the learner had at least one real qualifying learning session on a local learning date.

Required invariant:

```text
UNIQUE(user_id, activity_date)
```

A protected day or repaired streak must **not** create a fake `LearningDay`.

#### `CoinTransaction`

Keep the ledger concept, but strengthen idempotency and attribution.

#### `ShopItem` + `UserInventory`

May remain generic infrastructure, but Gamification v1 initially needs only one purchasable inventory item:

```text
STREAK_PROTECTOR
coinCost = 50
maxOwned = 2
```

A broad catalog is out of scope.

### 2.2 Defer / do not build around

`StreakChallenge` currently reflects an older paid-entry challenge concept. Do not expand or integrate it into Gamification v1. It may be redesigned, migrated or removed later.

## 3. Proposed domain entities

Names below are contract-level recommendations. Exact Prisma names may vary if implementation gains clarity without changing semantics.

### 3.1 GamificationLearningEvent

Purpose:

- durable record of one qualifying completed learning session;
- source for Daily Goal progress;
- idempotent bridge between learning domains and Gamification.

Suggested fields:

```text
id
userId
eventType
sourceType
sourceId
learningDate
occurredAt
createdAt
```

Runtime v1 event types:

```text
LESSON_COMPLETION
UNIT_CHALLENGE_COMPLETION
REVIEW_COMPLETION
```

Required uniqueness:

```text
UNIQUE(user_id, source_type, source_id)
```

A retry for the same completed run/session resolves to the existing event, without another Daily Goal unit or reward. The database still accepts reserved `LESSON_REPLAY_COMPLETION` and `PRACTICE_COMPLETION` values for a future approved extension; runtime v1 does not emit them.

### 3.2 UserStreak

Purpose:

- compact authoritative streak state/read model;
- avoid reconstructing the entire streak from history for every Home request.

Suggested fields:

```text
userId PK
currentDays
longestDays
lastLearningDate nullable
lastEvaluatedDate nullable
updatedAt
```

Do not encode protected days as real learning days here.

Historical truth comes from:

- `LearningDay`;
- Protector consumption records;
- Repair records.

### 3.3 GamificationSettings

Purpose:

- Daily Goal configuration.

Suggested fields:

```text
userId PK
dailyGoalPreset
pendingDailyGoalPreset nullable
pendingEffectiveDate nullable
updatedAt
```

Allowed presets:

```text
CASUAL
NORMAL
INTENSE
```

Default: `NORMAL`.

If the learner changes the preset after today's reward was already granted, store the pending preset for the next local learning day.

### 3.4 StreakProtectionEvent

Prefer one durable event/history table for automatic Protector use.

Suggested fields:

```text
id
userId
protectedDate
shopItemId / protectorCode
createdAt
```

Required uniqueness:

```text
UNIQUE(user_id, protected_date)
```

This proves that a missed date was protected without fabricating a `LearningDay`.

### 3.5 StreakRepair

Repair is not inventory.

Suggested fields:

```text
id
userId
brokenDate
previousStreakDays
eligibleUntil
status
repairedAt nullable
coinTransactionId nullable
createdAt
updatedAt
```

Suggested statuses:

```text
ELIGIBLE
USED
```

Expiration may be derived from `eligibleUntil`; an explicit `EXPIRED` mutation is optional and should not require a cron job.

Only one repair candidate should be active for the relevant break.

## 4. Local learning date and timezone

`User.timezone` is authoritative for future learning-date derivation.

Use an IANA timezone identifier, for example:

```text
America/Mazatlan
America/Mexico_City
America/New_York
```

Do not store fixed offsets as the canonical timezone.

For every qualifying completion:

```text
occurredAt (UTC) + user.timezone -> learningDate (DATE)
```

Once persisted, a historical `learningDate` is immutable even if the user later changes timezone.

Timezone changes affect future events only.

## 5. Qualifying learning-event ingestion

Learning domains do not grant coins directly.

On a durable completion, they call an internal Gamification application service such as:

```text
recordLearningCompletion({
  userId,
  eventType,
  sourceType,
  sourceId,
  occurredAt,
  scoreContext?
})
```

The operation must be transactional where practical with the source completion, or otherwise safely retryable.

Processing responsibilities:

1. derive immutable `learningDate`;
2. insert/idempotently resolve `GamificationLearningEvent`;
3. insert/idempotently resolve `LearningDay`;
4. reconcile streak through that date;
5. evaluate first-time progression/perfect rewards;
6. evaluate streak milestone rewards;
7. evaluate Daily Goal progress/reward;
8. return a reward/streak summary that the source Result response may expose.

The client must never call an "award coins" endpoint.

## 6. Streak reconciliation

Streak evaluation is **lazy/event-driven**, not cron-driven.

Reconcile when relevant state is read or mutated, including:

- `GET /me/gamification`;
- a qualifying learning completion;
- Protector purchase/use-related reads;
- Repair eligibility/use.

### 6.1 General rule

Let:

```text
lastContinuityDate
todayLocal
```

be the last date covered by either real learning or accepted streak continuity and the current user-local date.

Evaluate missed dates in chronological order.

For each missed date before the current qualifying date/read date:

1. if a Protector is available, consume one automatically and record a `StreakProtectionEvent`;
2. otherwise the streak breaks on that date.

### 6.2 Multiple consecutive missed days

- One Protector covers one date.
- Two missed dates require two Protectors.
- If protection inventory is exhausted and another missed date remains, streak breaks.

### 6.3 Break behavior

When a streak breaks:

- preserve `longestDays`;
- current streak becomes zero until new real learning begins, unless an eligible Repair is successfully used;
- evaluate whether the break is Repair-eligible.

### 6.4 Repair eligibility

Repair is eligible only when:

- exactly one uncovered missed local learning day caused the recent break;
- the break is within the 24-hour eligibility window;
- the user has not successfully repaired a streak in the previous 14 days;
- the user has at least 120 coins at purchase time.

Longer uncovered absences are not repairable in v1.

## 7. Protector purchase and use

### 7.1 Catalog config

Initial item:

```text
code = STREAK_PROTECTOR
coinCost = 50
maxOwned = 2
active = true
```

### 7.2 Purchase transaction

Purchase must atomically:

1. verify item is active;
2. lock/check current inventory quantity;
3. reject if quantity already equals `maxOwned`;
4. verify sufficient coin balance;
5. create one negative ledger transaction;
6. increment inventory by one.

Required request idempotency:

```text
UNIQUE(user_id, idempotency_key)
```

or equivalent.

A repeated purchase request with the same request key must return the original successful result, not charge twice.

### 7.3 Automatic consumption

Protector consumption:

- is server-side only;
- decrements inventory atomically;
- records which local date was protected;
- does not create a coin transaction at consumption time because payment happened at purchase;
- does not create `LearningDay`.

## 8. Streak Repair transaction

Repair endpoint must atomically:

1. reconcile current streak state;
2. verify active Repair eligibility;
3. verify 24-hour window;
4. verify 14-day cooldown;
5. verify sufficient balance;
6. create a `-120` coin transaction;
7. mark Repair as used;
8. restore the previous streak continuity/state;
9. preserve real-learning history unchanged.

Required idempotency:

- same repair candidate can be used at most once;
- repeated HTTP retry must not charge again.

Repair must not:

- add a `LearningDay`;
- complete Daily Goal;
- create a streak milestone reward merely because old continuity was restored again.

## 9. Daily Goal

### 9.1 Preset config

```text
CASUAL  target=1 reward=5
NORMAL  target=2 reward=10
INTENSE target=3 reward=15
```

Use configuration/constants at domain level rather than scattering values through controllers/mobile.

### 9.2 Progress calculation

Daily Goal progress is derived from distinct `GamificationLearningEvent` rows for today's `learningDate`.

```text
progress = count(events for user + today)
```

Do not persist a mutable incrementing counter unless profiling later proves it necessary.

### 9.3 Completion

Daily Goal is completed when:

```text
progress >= target
```

and today's Daily Goal reward does not already exist.

Ledger idempotency key:

```text
daily-goal:<YYYY-MM-DD>
```

Maximum one Daily Goal reward per local learning date.

### 9.4 Preset changes

Before today's reward:

- change applies immediately;
- existing progress is evaluated against the new target;
- if already satisfied, grant the new preset's one daily reward.

After today's reward:

- current day's earned reward is immutable;
- change becomes effective next local learning day.

## 10. Coin ledger

`CoinTransaction` is the durable source of truth for coin history.

Required/strongly recommended fields:

```text
id
userId
amount
reason
referenceType nullable
referenceId nullable
referenceValue nullable
idempotencyKey
createdAt
```

Required uniqueness:

```text
UNIQUE(user_id, idempotency_key)
```

Initial reasons:

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

Positive values award coins; negative values spend coins.

### 10.1 Balance

For v1, authoritative balance may be:

```text
SUM(coin_transactions.amount)
```

Do not introduce a mutable cached balance unless implementation/performance evidence requires it.

All spending must execute inside a transaction with concurrency-safe balance validation so two simultaneous spends cannot overdraw.

## 11. Reward rules

### 11.1 Lesson

First Lesson completion:

```text
+3
idempotencyKey = lesson:first-completion:<lessonId>
```

Perfect first Lesson result:

```text
+2
idempotencyKey = lesson:first-perfect:<lessonId>
```

The perfect bonus is based on the first relevant score-bearing completed Lesson result. Replay cannot create or improve eligibility later.

### 11.2 Unit Challenge

First pass:

```text
+8
idempotencyKey = unit-challenge:first-pass:<unitChallengeId>
```

Perfect first completed run:

```text
+3
idempotencyKey = unit-challenge:first-perfect:<unitChallengeId>
```

If the learner's first completed run is not perfect, a later perfect replay does not earn this bonus.

A failed completed run still counts for streak and Daily Goal.

### 11.3 Course completion

```text
+20
idempotencyKey = course:first-completion:<courseId>
```

Grant only from durable Course-completion state.

### 11.4 Streak milestones

Configured initial thresholds:

```text
7   -> +10
14  -> +15
30  -> +30
60  -> +50
100 -> +75
```

Coin reward is lifetime-unique per account/threshold:

```text
idempotencyKey = streak-milestone:<threshold>
```

Reaching the same threshold in a later streak may produce presentation metadata for a visual celebration, but grants no second coin transaction.

`longestDays` remains historical and does not reset when current streak breaks.

## 12. Result integration contract

Lesson and Unit Challenge completion responses may include a compact gamification delta produced by the internal Gamification service.

Conceptual shape:

```json
{
  "gamification": {
    "coinsEarned": 5,
    "coinRewards": [
      { "reason": "LESSON_FIRST_COMPLETION", "amount": 3 },
      { "reason": "LESSON_FIRST_PERFECT", "amount": 2 }
    ],
    "balance": 74,
    "streak": {
      "currentDays": 12,
      "advancedToday": true,
      "protectedDate": null
    },
    "dailyGoal": {
      "preset": "NORMAL",
      "progress": 2,
      "target": 2,
      "completed": true,
      "rewardEarnedNow": 10
    }
  }
}
```

A later session on the same learning date should report:

```text
advancedToday = false
```

even though the streak remains active.

## 13. Read API

### 13.1 GET /me/gamification

Purpose:

- primary aggregate read for Home/header/Progress integration.

Conceptual response:

```json
{
  "coins": {
    "balance": 74
  },
  "streak": {
    "currentDays": 12,
    "longestDays": 27,
    "activeToday": true,
    "protectorCount": 1,
    "protectorMax": 2,
    "nextMilestone": {
      "days": 14,
      "rewardCoins": 15,
      "rewardAlreadyEarned": false
    },
    "repair": null
  },
  "dailyGoal": {
    "preset": "NORMAL",
    "target": 2,
    "progress": 1,
    "rewardCoins": 10,
    "completed": false,
    "pendingPreset": null
  }
}
```

Eligible Repair example:

```json
{
  "eligible": true,
  "previousDays": 23,
  "costCoins": 120,
  "expiresAt": "2026-10-01T18:00:00.000Z"
}
```

This endpoint should reconcile stale streak/protection state before returning.

## 14. Mutation API

### PATCH /me/gamification/timezone

Authenticated request: `{ "timezone": "America/Mazatlan" }`.

Success: HTTP 200 with only `{ "timezone": "America/Mazatlan" }`.

- Requires a non-empty string validated through the same `Intl.DateTimeFormat` IANA strategy used for learning dates. Valid identifiers, including UTC and IANA aliases, are stored as supplied.
- Invalid input, including fixed offsets `UTC-7`, `+07:00`, `-0700`, returns HTTP 400 with `INVALID_USER_TIMEZONE`. Missing authentication returns 401.
- Uses the existing user-row lock to serialize with completion ingestion. Sending the existing timezone is a no-op; changing it updates User.timezone and its normal updatedAt timestamp.
- No Gamification initialization or reconciliation runs in this endpoint. Historical LearningDays, event learningDates, streak state/history, rewards, ledger, inventory, protections and repairs remain untouched. Only future event-date derivation uses the new timezone.
- Mobile must synchronize the device's IANA timezone after login and on the appropriate app-entry/bootstrap path, before fetching Gamification or submitting new completions. The same request can be repeated safely; resynchronize when the device timezone changes. Mobile implementation remains outside this backend pass.

### 14.1 PATCH /me/gamification/daily-goal

Request:

```json
{
  "preset": "INTENSE"
}
```

Response should state whether the change:

- applies today; or
- is scheduled for the next local learning day.

If the immediate change newly satisfies today's target, reward may be granted in the same transaction/operation.

### 14.2 POST /me/gamification/protectors/purchase

Request body: `{ "requestKey": "<16–100 ASCII letters/digits/underscore/hyphen>" }`, following the existing mutation convention. Successful mutation keys use the shared ledger namespace `request:<requestKey>`; reusing a purchase key for Repair or vice versa returns `IDEMPOTENCY_CONFLICT`.

Response:

```json
{
  "coins": { "balance": 24 },
  "protector": {
    "count": 2,
    "max": 2
  }
}
```

Errors:

- insufficient coins;
- max stock reached;
- inactive/unavailable item;
- invalid/reused idempotency key with mismatched payload if the project enforces request hashes.

### 14.3 POST /me/gamification/streak/repair

Request body: `{ "requestKey": "<stable key>", "repairId": "<candidate UUID from GET>" }`. Binding the key to the candidate prevents a retry from repairing a later break. The aggregate includes the candidate `id`. The same successful request returns current balance/streak without another debit; a different key for an already-used candidate returns `ALREADY_REPAIRED`.

Response:

```json
{
  "coins": { "balance": 34 },
  "streak": {
    "currentDays": 23,
    "longestDays": 23,
    "repaired": true
  }
}
```

Errors:

- no eligible repair;
- repair expired;
- repair cooldown active;
- insufficient coins;
- already repaired.

### 14.4 Coin transaction history

A transaction-history endpoint is **not required by Mobile v1** unless a UI explicitly needs it.

Do not expose an endpoint that lets clients create arbitrary coin transactions.

## 15. Integration points

### 15.1 Lesson

After a Lesson run becomes durably completed:

- send `LESSON_COMPLETION` for first or normal completion;
- use the run/source ID as durable event identity;
- exclude ephemeral Lesson Replay entirely: no event, LearningDay, streak, Daily Goal or reward;
- evaluate first-completion/perfect reward from durable Lesson state.

### 15.2 Unit Challenge

After a Unit Challenge run becomes durably `COMPLETED`:

- record one `UNIT_CHALLENGE_COMPLETION` event regardless of pass/fail;
- evaluate first-pass reward from durable `UnitChallengeProgress`;
- evaluate perfect-first-run bonus from historical runs.

### 15.3 Review

A Review session must have a durable session/batch identity before it can count as one Daily Goal/streak event.

Do not count each reviewed Activity as a separate Gamification session.

### 15.4 Practice

Practice is future-facing. When implemented, it must expose one durable completed-session identity and use the same ingestion contract.

## 16. Concurrency and transaction requirements

Critical operations must be safe under concurrent requests.

At minimum:

- unique learning-event identity prevents double Daily Goal units;
- unique coin idempotency key prevents duplicate rewards/spends;
- Protector purchase checks balance and inventory cap atomically;
- Repair checks balance/eligibility and marks usage atomically;
- automatic Protector consumption cannot consume the same inventory unit twice;
- milestone reward uniqueness is database-enforced or transactionally equivalent.

Do not rely on in-memory locks for correctness.

## 17. HTTP/error behavior

Follow existing project conventions for authentication and error envelopes.

Expected domain conflicts should map consistently to conflict/validation semantics rather than 500s.

Candidate machine-readable error codes:

```text
INSUFFICIENT_COINS
PROTECTOR_STOCK_FULL
STREAK_REPAIR_NOT_ELIGIBLE
STREAK_REPAIR_EXPIRED
STREAK_REPAIR_COOLDOWN
INVALID_DAILY_GOAL_PRESET
IDEMPOTENCY_CONFLICT
```

HTTP: authentication 401; invalid preset/request key/repair UUID 400; missing user 404; domain conflicts 409. Errors retain the existing `{ error: { code, message } }` envelope. Unavailable or misconfigured Protector catalog returns `ITEM_UNAVAILABLE`.

## 18. Mobile contract boundaries

Gamification backend must provide enough real data for these surfaces without inventing client state.

### Home

Needs:

- balance;
- streak current days / active today;
- Daily Goal progress;
- Daily Goal preset.

### Result

Needs:

- event-specific rewards just granted;
- current balance;
- streak advanced/not advanced;
- Daily Goal progress/completion/reward.

### Progress

Needs:

- current and longest streak;
- weekly real-learning-day state;
- Protector stock;
- next milestone;
- earned milestone state.

### Profile

Needs:

- current/pending Daily Goal preset.

### Nested Shop / protection

Needs:

- balance;
- Protector price;
- Protector stock/max;
- Repair only when contextually eligible.

## 19. Deferred scope

Do not implement during Gamification v1 backend:

- real-money coin purchases;
- paid hints/explanations;
- leaderboard/social;
- vehicle cosmetics;
- broad Shop catalog;
- Streak Challenges;
- Ads;
- individual-course monetization;
- XP;
- hearts/lives;
- Unit Challenge answer-review feature.

## 20. Migration / implementation checklist

Before implementation is considered complete:

1. update Prisma schema with approved new models/constraints;
2. add SQL constraints/indexes where Prisma cannot express them safely;
3. seed/configure `STREAK_PROTECTOR`;
4. create Gamification module service/repository/types/routes;
5. wire Lesson completion;
6. wire Unit Challenge completion;
7. wire durable Review-session completion;
8. add exhaustive idempotency/concurrency tests;
9. add timezone/date-boundary tests;
10. add Protector multi-day tests;
11. add Repair eligibility/expiration/cooldown tests;
12. add Daily Goal preset-change tests;
13. add lifetime-unique milestone tests;
14. add result-delta tests;
15. keep deferred `StreakChallenge` behavior untouched.

## 21. Pre-implementation approval status

Approved at contract level:

- domain responsibilities;
- lazy streak reconciliation;
- real `LearningDay` only for real study;
- durable qualifying-session event ledger;
- Daily Goal derivation from session events;
- coin ledger as authoritative history;
- no broad Shop;
- Protector inventory semantics;
- Repair contextual semantics;
- milestone lifetime uniqueness;
- no client-driven rewards.

The next technical step is to translate this contract into the **exact Prisma schema + migration plan**, review the delta against the current database, and only then begin backend implementation.

## 22. Implemented transaction and compatibility details

- All five routes are registered under `/me/gamification`. GET lazily reconciles inside the same per-user PostgreSQL row-lock transaction as mutations.
- Completed LessonRun, final Unit Challenge submission, and completed Review batch call Gamification within their existing transaction. A failure rolls back the source completion, progression, Review and Gamification together.
- Review uses the authenticated token's existing `batchId` and full item membership. Completion means every authorized item has a durable attempt for that user/batch, irrespective of correctness. Partial/abandoned batches count zero; individual attempts never count as separate sessions. No new Review session table is needed. The final attempt stores its response including the delta for retry.
- The real `CourseProgress` transition exists in Lesson and Unit Challenge completion. Its affected-row count gates the +20 reward, with a second lifetime ledger uniqueness guarantee.
- Lesson completion retries return current Gamification state and zero newly earned coins. Unit Challenge final-submit and Review final-attempt retries preserve their existing stored response semantics. Old already-completed Lessons are not retroactively granted rewards by fetching a Result.
- Daily Goal PATCH returns `applies: TODAY | NEXT_LOCAL_DAY`, `effectiveDate`, the aggregate and `coinsEarned`. A rewarded day's preset stays fixed; a pending choice applies on the next local date. No claim endpoint exists.
- Protector uses catalog code `STREAK_PROTECTOR`; unavailable/inactive or mismatched v1 configuration fails closed. Consumption uses already-owned stock in chronological missed-date order. Stock bought after a break cannot retroactively protect evaluated dates.
- Repair windows begin at detection and last exactly 24 elapsed hours; cooldown lasts 14 elapsed days after the latest successful repair. A second uncovered date invalidates the candidate. Expiration is time-derived. Repair reconnects previous continuity and retains any real learning completed since the single missed date, without adding a LearningDay or granting rewards.
- Invalid IANA timezone configuration returns `INVALID_USER_TIMEZONE`; historical event dates are never re-derived. Ingestion is internal and synchronous with source completion, not a client or historical backfill API.
- No schema change or new migration was required. Existing legacy LearningDays remain historical input; no historical session events or rewards are manufactured.
