# AGENTS.md

## Purpose

This repository is the source of truth for the Teacher Alma app. Keep agent work scoped, deterministic, and cheap to review.

## Read only what the task needs

Do not reread the whole repository or all docs on every task.

Start with:
1. this file;
2. the files directly named by the task;
3. the nearest relevant docs;
4. only then inspect adjacent implementation if required.

Prefer targeted reads/searches over broad repository scans.

## Repository map

- `mobile/`: React Native + Expo + TypeScript app.
- `backend/`: Node.js + Express + TypeScript + Prisma + PostgreSQL.
- `docs/`: product, architecture, API, business rules, screens, design direction and mockups.

Main architecture:
- Backend: Route -> Controller -> Service -> Repository -> Prisma/PostgreSQL.
- Mobile: feature-based organization.
- Product implementation style: vertical slices.

## Source-of-truth docs by concern

Read only the relevant group.

### Architecture / domain
- `docs/architecture.md`
- `docs/business-rules.md`
- `docs/data-model.md`
- `docs/database-schema.md`
- `docs/api-contracts.md`

### Lessons
- `docs/lesson-content-contract-v2.md`
- `docs/activities.md`
- `docs/screens.md`
- `docs/design-direction.md`
- `docs/mockups/lessons/`
- `docs/mockups/activities/`
- `docs/mockups/results/`
- `mobile/LESSONS.md`

### Courses
- `docs/screens.md`
- `docs/design-direction.md`
- `docs/mockups/courses/`

Do not load unrelated verticals unless a dependency actually crosses them.

## Stable product rules

Do not change these unless the user explicitly asks to change product behavior.

- Course -> Topic -> Lesson.
- Lesson block types: TEXT, VIDEO, IMAGE, EXAMPLE, ACTIVITY, SUMMARY.
- Completion and correctness are separate.
- Wrong answers do not block lesson completion.
- First submitted attempt is the score-bearing attempt.
- Retry attempts are stored and do not rewrite first-attempt score.
- Incorrect attempts may create Review state; an immediate correct retry does not silently resolve it.
- TAP is the required Matching interaction; DRAG may be deferred.
- Optional lesson steps must not block required progression.
- Commercial access and progression are backend decisions.
- Do not invent learner-facing data that the API/content contract does not provide.

## Lessons content v2

Prefer structured v2 fields and preserve v1 fallbacks.

- TEXT: `segments` with optional `KEY`.
- EXAMPLE: optional `DIALOGUE` with explicit turns.
- Activity: optional public `instruction` and `context` (TEXT, DIALOGUE, IMAGE).
- SUMMARY: subtitle, takeaways, keyPhrases.
- Audio controls only when a valid `audioUrl` exists.
- Never infer key phrases, speakers, answers or translations from strings.
- Never expose private answer configuration in GET lesson payloads.

## Visual direction

- Mockups are visual targets, not business-rule contracts.
- Real Android screenshots are evidence of current state, not the design target.
- White/light UI, blue primary, red CTA, rounded cards, restrained shadows.
- Prefer reusable visual primitives over one-off screen hacks.
- Preserve accessibility, safe areas, font scaling and narrow Android layouts.
- No dead controls.
- No arbitrary whitespace merely to fill the viewport.

## Git safety

Before editing:
- `git status --short --branch`
- inspect the recent relevant diff/history only if needed.

Default behavior:
- do not commit;
- do not push;
- do not merge;
- do not reset or discard local changes;

unless the user explicitly requests it.

If local changes already exist, identify whether they belong to the current iteration before editing.

## Scope discipline

Do not:
- redesign unrelated screens;
- add migrations for JSONB-only presentation changes;
- introduce providers/dependencies without need;
- reopen completed backend semantics for visual work;
- implement payments, gamification, Review sessions, AI, TTS or admin as side effects of another task.

If a blocker requires crossing the requested boundary, report the blocker first.

## Token / context efficiency

- Do not summarize files back to yourself unless needed for a decision.
- Do not reopen files already inspected in the same task unless they changed.
- Use exact file paths and focused searches.
- Prefer diffs over rereading full large files after edits.
- Run the narrowest relevant tests first; run broader suites only when the change surface warrants it.
- Avoid repeated product analysis when the prompt already contains accepted decisions.
- Final reports should state changed files, behavior, tests, remaining debt and git status; do not restate the whole prompt.

## Common validation

For mobile-only work, normally validate:
- TypeScript;
- relevant mobile tests;
- Android/Expo export when the iteration requires physical acceptance;
- `git diff --check`.

For backend Lessons work, validate:
- TypeScript;
- Lessons-specific unit/integration tests;
- PostgreSQL integration when persistence/HTTP behavior changed;
- seed/check scripts when demo data changed;
- `git diff --check`.

Do not rerun full backend suites for purely visual mobile changes.

## Demo environment

Local demo database is PostgreSQL `teacher_alma_dev`.

Typical Lessons demo commands:

```powershell
Set-Location C:\software-development\projects\teacher-alma-app\backend
node --import tsx scripts/seed-courses-demo.ts --reset --lessons
node --import tsx scripts/seed-courses-demo.ts --check
```

Use the repository docs for the current exact Android/backend/Expo acceptance route rather than reproducing it in every prompt.

## Working style

The user wants meaningful progress over perfection, but important architecture and rules should remain understandable.

For implementation tasks:
- inspect;
- implement;
- test;
- report.

Do not stop at generic recommendations when the task asks for code changes.
