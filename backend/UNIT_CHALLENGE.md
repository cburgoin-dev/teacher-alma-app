# Backend Unit Challenge v1

Local development uses PostgreSQL `teacher_alma_dev` on port 5433 and the existing development auth user.

From `backend/`:

```powershell
node node_modules/prisma/build/index.js migrate deploy
node node_modules/prisma/build/index.js generate
node --import tsx scripts/seed-courses-demo.ts --apply
node --import tsx scripts/seed-courses-demo.ts --check
```

`--apply` preserves learner history. Each demo Topic receives a deterministic challenge with a Conversation and a five-word Crossword; the small introductory scene is reused in the demo Topics. Publication validation checks every exposed Topic and all phase configs. No Admin tooling is involved.

The first A1 challenge is `6ac0de00-0000-4000-8000-000000050101`. Its three required Lessons must be complete. For a reproducible entry-ready demo, `seed-courses-demo.ts --reset` resets only the configured user's named demo learning data and completes those three Lessons. `--reset --lessons` instead leaves the third Lesson pending. `--reset --access-boundary` also passes the first challenge through the real service and leaves the next paid Lesson as the frontier.

Use the existing development auth configuration, then GET `/unit-challenges/<id>` and POST `/unit-challenges/<id>/runs` with a unique 16–100 character ASCII `requestKey`. Submit the current phase through the documented API. Empty `choices: []` / `entries: []` are valid; omitted items score zero. `complete-unit-challenge-demo.ts` is a private development helper for acceptance scripts, not an application endpoint.

Content/import conventions: phase positions start at 1 and are contiguous; crossword row/column coordinates start at 0. Canonical words and submitted words use trim + Unicode NFC + uppercase + NFC, with no fuzzy or accent-insensitive matching. Conversation correctness uses one private `correctOptionId` referencing a unique option.

Every run snapshots its ordered phases, private content, item counts and passing threshold. A phase stores its normalized answer/hash and public response receipt atomically. The receipt provides exact transport retries even after subsequent phases or progression changes; historical run GETs report the frozen run result. Run/phase writes share the existing user lock with Lessons/Review and additionally lock the run and submitted phase. Completed replays never overwrite consolidated progress.

Validation:

```powershell
node node_modules/prisma/build/index.js validate
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json
$env:RUN_UNIT_CHALLENGE_DB_TESTS='1'
$env:RUN_LESSONS_DB_TESTS='1'
$env:RUN_REVIEW_DB_TESTS='1'
node --import tsx --test src/modules/unit-challenges/*.test.ts src/modules/courses/*.test.ts src/modules/lessons/*.test.ts src/modules/review/*.test.ts
```

Database integration tests use fresh UUID fixtures and clean only those fixtures. Migration tests use disposable schemas. Demo HTTP acceptance is available via `node --import tsx scripts/check-lessons-demo.ts --run`; it deliberately resets the configured user's demo learning data and finishes at the Lessons baseline.
