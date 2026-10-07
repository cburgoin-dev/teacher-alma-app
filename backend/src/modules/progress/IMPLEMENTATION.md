# Progress Backend v1

Authenticated `GET /me/progress` and `GET /me/progress/calendar?month=YYYY-MM`
follow Controller -> Service -> Repository -> Prisma/PostgreSQL. Routes are
composed in `src/shared/app.ts` and wired in `src/server.ts`.

- Dashboard course selection reuses `courses/course.selection.ts` and
  `course.selection.repository.ts`, extracted from Home without changing its
  hidden-only hero behavior. Completion sources include LessonProgress,
  completed LessonRun replays and UnitChallengeProgress. Progress selects only
  visible candidates, then uses the existing `courseProgress` required-node projection.
- Review reads compact ACTIVE item/source fields and entitlements. Shared
  `eligibleReviewItems` and `reviewGroups` preserve Review eligibility, ordering
  and complete topic counts; Progress returns only the first two groups.
- History reads bounded LearningDay, StreakProtectionEvent and StreakRepair
  facts. Precedence is LEARNED > REPAIRED (USED) > PROTECTED > BROKEN (non-USED).
  Only LEARNED contributes to learning-day counts. Weekly output always has
  seven Monday-Sunday slots; future slots are NONE. Calendar output is sparse,
  sorted and confined to the requested month.
- User.timezone and pure Gamification date helpers determine today, week bounds
  and future-month validation. Stored PostgreSQL DATE values are serialized as
  durable local dates, never reinterpreted in the current timezone. Repair history
  is placed on brokenDate, not repairedAt.
- Every read uses a RepeatableRead transaction with `SET TRANSACTION READ ONLY`.
  No GamificationService, reconciliation, internal HTTP requests, writes or
  inventory/coin/streak initialization. Calendar does not load course/Review data.
- No schema changes or migrations: existing facts and indexes suffice for v1.
  No Progress-owned durable state or Mobile changes.

## Validation (from backend, PowerShell)

```powershell
npx tsc --noEmit
node --import tsx --test src/modules/progress/progress.service.test.ts src/modules/progress/progress.http.test.ts src/modules/home/home.service.test.ts src/modules/home/home.http.test.ts
$env:RUN_PROGRESS_DB_TESTS='1'
$env:RUN_HOME_DB_TESTS='1'
$env:RUN_REVIEW_DB_TESTS='1'
node --import tsx --test --test-concurrency=1 src/modules/progress/progress.integration.test.ts src/modules/home/home.integration.test.ts src/modules/review/review.integration.test.ts
git diff --check
```

Integration tests require the guarded local development PostgreSQL database
`teacher_alma_dev` on port 5433. They create isolated UUID fixtures and clean up
only those fixtures. Progress tests compare full rows (including timestamps)
for User and every public table with user_id before/after repeated GETs, with
persisted progress, Review, history, repairs, inventory, stale streak, coins,
settings and learning events present. They also verify timezone changes,
overlapping date facts, durable course-selection timestamps and Review parity.
