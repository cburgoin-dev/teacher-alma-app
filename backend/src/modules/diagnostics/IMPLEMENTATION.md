# Diagnostic Backend v1

Implemented against the frozen Diagnostic semantics/API and Home integration contract.

## HTTP and ownership

- `GET /diagnostic`: read-only intro and authoritative availability.
- `POST /diagnostic/attempts`: fresh intention or idempotent initial response.
- `POST /diagnostic/attempts/:attemptId/questions/:questionId/submit`: one final answer, next question or atomic completion/result.
- `POST /diagnostic/attempts/:attemptId/abandon`: idempotent abandonment.
- `GET /diagnostic/result`: latest completed result with the historical course hydrated from current Courses truth.

Routes/controller/service/repository compose through the optional final `createApp` argument. No resume, explicit completion, history or admin endpoints. No progression, Review, Gamification or course-start writes.

`activities/activity.engine.ts` owns the shared evaluator/public allowlist; `activities/activity.content.ts` owns reusable presentation parsing. Lessons keeps compatibility exports and unchanged evaluation semantics. Review imports the same shared evaluator.

## Scoring and availability

`scoringConfig.recommendationRules` is ordered JSON. Each rule has `level`, optional `minOverallScore` (defaults to zero), and `requirements: [{ targetLevel, minScore }]`. The final rule must have zero minimum and no requirements. Thresholds are finite JSON numbers in 0..100, level names are nonempty strings, and requirements must refer to measured levels.

Weights use the database's three-decimal scale as integer units. BigInt cross multiplication compares exact unrounded weighted ratios to decimal thresholds. Only after selecting the first matching rule is the overall score rounded half-up to three decimals for storage. Null target levels contribute only to overall scoring.

Availability validates every Activity through the shared engine and computes actually reachable outcomes, including rule precedence, discrete weights and questions that cannot be answered incorrectly. The search memoizes aggregate scores and prunes monotone subtrees; it is intended for short authored assessments, not large adaptive question banks. Every reachable destination must currently be PUBLISHED; commercial entitlement does not affect this decision. Home calls the same availability function inside its read-only transaction and adds `hero.diagnosticAvailable` only to NEW.

## Transactions and history

Every mutation acquires the existing per-user PostgreSQL row lock before reading lifecycle state. Submit/abandon also lock the attempt. Partial indexes enforce one ACTIVE attempt per user and one PUBLISHED definition. Start holds shared publication/catalog table locks until the new attempt commits. Content publication tooling should use one transaction, archiving the old version before publishing the replacement; demo tooling takes table locks in the same order.

Submission hashes the validated answer and question id with SHA-256. Matching pairs are ordered by word id before hashing. Unique attempt/question and attempt/submission-key indexes protect finality. Every accepted submission stores its exact public JSON receipt, including the final response. Receipt retries intentionally replay historical response content; GET result independently hydrates current course state. Start retries return the original first-question outcome only while their attempt remains ACTIVE; terminal start-key reuse conflicts.

The final attempt update, answer insert and receipt are one transaction. Failure rolls back all of them. In-flight attempts use their bound version even when it becomes ARCHIVED. Database triggers prevent academic edits to published/archived definitions, questions and referenced Activities. Archived content without any attempts may be removed by maintenance; referenced historical content remains protected by FKs. Published content must be versioned, not modified in place.

The recommended-course FK uses RESTRICT. Catalog retirement uses status; GET never substitutes a different course for a hidden historical recommendation. Projection reuses `isVisible`, `courseProgress` and `courseAccess` from Courses.

## Migration

`20261013000000_diagnostic_v1` adds metadata/scoring JSON, start/submission keys, hashes, receipts, abandoned timestamps, checks, indexes and content immutability triggers. Existing legacy attempts/answers receive synthetic keys; incomplete legacy attempts are abandoned, preserving completed history. The relation remains Answer → Question → Activity. No separate result table or per-attempt content snapshot.

The migration was applied to local `teacher_alma_dev`; Prisma datasource-to-schema diff reports no differences.

## Demo

From `backend/`, with the existing local development environment:

```powershell
node --import tsx scripts/seed-diagnostic-demo.ts --apply
node --import tsx scripts/seed-diagnostic-demo.ts --check
node --import tsx scripts/seed-diagnostic-demo.ts --check-unavailable
```

Apply requires the existing Courses demo's PUBLISHED A1/A2 catalog and does not reset users, attempts or progress. It creates four separate Diagnostic Activities covering all supported types, five-minute editorial duration and configurable A1/A2 rules. A repeated apply preserves the published content. It refuses to replace another published definition or overwrite an archived demo version.

`--check-unavailable` is a read-only assertion for unavailable catalog/configuration scenarios (and succeeds before the first apply). Missing/COMING_SOON destinations and invalid content/configuration are exercised without altering the demo by the isolated PostgreSQL suite. The current seeded demo remains available. Questions, weights, duration and thresholds are explicitly non-production content pending Alma's values.

## Validation

```powershell
node node_modules/typescript/bin/tsc --noEmit
node node_modules/prisma/build/index.js validate
node node_modules/prisma/build/index.js migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
$env:RUN_DIAGNOSTIC_DB_TESTS='1'
$env:RUN_HOME_DB_TESTS='1'
$env:RUN_LESSONS_DB_TESTS='1'
node --import tsx --test src/modules/diagnostics/*.test.ts src/modules/home/*.test.ts src/modules/lessons/*.test.ts src/modules/review/review.activity.test.ts scripts/diagnostic-demo.test.ts scripts/lessons-demo.test.ts
git diff --check
```

Diagnostic PostgreSQL tests create a random isolated schema, run all SQL migrations and remove only that schema afterward. Coverage includes HTTP authentication/validation, all Activity types, ordering/privacy, exact scoring boundaries, transport conflicts, retakes/version switching, current/historical Courses projections, Home precedence, zero learning/gamification effects, partial indexes, concurrent starts/submits/abandon and final-answer rollback.

Acceptance run: 84 tests passed, zero failures/skips. TypeScript, Prisma validation, schema diff and both demo checks passed. The existing pg adapter emits its concurrent-query deprecation warning in PostgreSQL suites; it does not fail validation. No Mobile changes or new dependencies.
