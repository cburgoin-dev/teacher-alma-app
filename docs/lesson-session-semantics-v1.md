# Lessons Session Semantics v1

Status: implemented with automatic pedagogical completion — pending physical Android acceptance.

This document defines the lifecycle of a normal lesson session after the Replay v1 split. It supersedes the earlier MVP assumption that an unfinished lesson should resume from persisted traversal.

## Product decision

Teacher Alma lessons are intentionally short, focused sessions. A normal lesson run is treated as one coherent attempt from beginning to end.

- Entering a not-yet-completed lesson starts a fresh normal lesson run.
- The learner advances linearly through the run.
- The lesson back/chevron action is an exit affordance, not previous-step navigation.
- Trying to leave an unfinished run asks for confirmation.
- Confirming exit abandons the run.
- Re-entering after abandonment starts again at the first step with 0% session progress and fresh answers.
- If the app process dies or a prior ACTIVE run is otherwise left behind, the next explicit start abandons/replaces that stale run and starts fresh. There is no Resume UX.
- A completed lesson opens the existing read-only Replay flow. Replay and normal LessonRun are separate concepts.
- Future Review and Practice flows are also separate concepts.

The desired UX is therefore:

```text
not completed lesson
  -> NORMAL RUN (0–99%)
      -> last pedagogical requirement + atomic consolidation -> 100%
      -> Summary / Result (presentation only)
      -> abandon -> discard pedagogical effects

completed lesson
  -> REPLAY (fresh, read-only relative to durable lesson state)
```

## Why this direction

The app is designed around concise lessons, generally about 5–15 minutes. A session-oriented model keeps the interaction predictable and removes ambiguous partial-resume states.

This direction is compatible with established language-learning UX patterns where lessons are treated as discrete sessions and exiting a lesson is an explicit action. It is not the only viable industry pattern: some products synchronize partial progress and support continuation. Teacher Alma intentionally chooses the session-oriented variant because it better fits the planned lesson length and focused gamified flow.

Completed learning must remain durable even though incomplete runs are disposable.

## LessonRun domain model

Introduce an explicit persisted `LessonRun` for normal, not-yet-completed lesson executions.

Conceptual fields:

- `id`
- `userId`
- `lessonId`
- `status`: `ACTIVE | COMPLETED | ABANDONED`
- `currentBlockId` or equivalent current-run pointer
- `startedAt`
- `completedAt`
- `abandonedAt`
- timestamps as appropriate

A run is session state. `LessonProgress` remains the durable learner/lesson aggregate and should not be overloaded as the temporary run itself.

### Run attempts

Normal activity attempts belong to a `LessonRun`.

A run attempt may be persisted immediately for crash safety/analytics, but it has no durable pedagogical effect until its run completes.

Consequences:

- score is computed from first submissions within the completed run;
- retries within the same run do not rewrite that run's first-attempt score;
- attempts from ABANDONED runs do not contribute to lesson score;
- attempts from ABANDONED runs do not create or increment durable Review items;
- attempts from ABANDONED runs do not unlock progression or produce rewards.

A nullable/legacy relationship may be retained during migration if needed for existing development data.

### Run traversal

Temporary traversal belongs to the run, not directly to durable lesson completion.

Use explicit run traversal state where necessary (for example `LessonRunBlockProgress`) rather than writing durable `LessonBlockProgress` while a run is still incomplete.

The implementation should support required/optional blocks without inferring completion solely from an index when that would be incorrect.

## Start semantics

Starting an incomplete lesson:

1. validate publication, course progression and access;
2. if a stale ACTIVE run exists for this user+lesson, mark it ABANDONED;
3. create a new ACTIVE run;
4. return the first step with 0% run progress.

There is no normal Resume branch.

Repeated start requests for the same currently mounted run must be handled safely/idempotently enough to avoid accidental duplicate ACTIVE runs. The implementation may use an explicit run id/token returned to Mobile.

## Exit semantics

The app back/chevron action during a normal ACTIVE run attempts to exit the lesson.

Show a confirmation modal such as:

- title: `¿Salir de la lección?`
- message: `Si sales ahora, tendrás que comenzar la lección desde el principio.`
- primary safe action: `Seguir aprendiendo`
- destructive/secondary action: `Salir`

If the learner cancels, nothing changes.

If the learner confirms:

1. mark the current run ABANDONED;
2. do not consolidate score, Review, lesson completion, course progression or rewards;
3. return to Roadmap.

The normal lesson back action does not navigate to the previous learning step.

## Unexpected termination

The app cannot reliably send an abandon request when the process is killed, connectivity disappears or the device shuts down.

Therefore correctness must not depend on a client-side cleanup callback.

When the learner explicitly starts the lesson again, the backend treats any previous ACTIVE run as stale, marks/replaces it as ABANDONED, and creates a fresh run at 0%.

Backgrounding the app without destroying the mounted flow may keep the same in-memory run while the app remains alive. No long-lived Resume guarantee is provided.

## Completion and consolidation

Only completing an ACTIVE normal run consolidates durable pedagogical state.

At completion, atomically:

- validate required run traversal/submissions;
- mark the run COMPLETED;
- derive run score from first submissions in that run;
- mark durable `LessonProgress` completed;
- materialize/merge durable `LessonBlockProgress` as needed;
- create/update Review items from all incorrect submissions in the completed run;
- update course progress;
- later, when Gamification is implemented, award completion effects exactly once.

Correctness remains separate from completion.

The operation must be idempotent.

## Review rule

An ABANDONED run creates no durable Review effects.

This is intentional: abandoning the session means the run was not accepted as a completed pedagogical record.

Within a COMPLETED run:

- incorrect first submissions may create/update Review;
- immediate retries do not erase that first-attempt learning signal;
- Review resolution still belongs to the future Review flow.

## Replay

Replay v1 remains separate and unchanged in principle.

- only for already COMPLETED lessons;
- fresh local session starting at 0%;
- answer checking through the dedicated read-only replay endpoint;
- no LessonRun required for Replay v1;
- no durable score, Review, course progress or rewards;
- returning to Roadmap focuses the real current frontier.

## Navigation

Normal ACTIVE run:
- back/chevron -> exit confirmation;
- no previous-step navigation through the header/back action.

Replay:
- may keep its currently defined local navigation behavior unless a later UX pass intentionally aligns it with the same exit-only model.

After abandoning a normal run:
- return to Roadmap;
- course frontier remains unchanged.

After completing a normal run:
- normal Result behavior applies.

## API direction

The implemented REST boundary uses explicit run ids; see docs/api-contracts.md.

Exact route shape may be adapted to the existing REST style, but the contract should make the run boundary explicit.

Conceptual operations:

- start/create normal run;
- complete/traverse a run step;
- submit a run activity answer;
- abandon a run;
- complete/consolidate a run.

Replay check remains the existing dedicated read-only operation.

Do not hide run identity only in implicit global server state if doing so makes concurrent/double-start behavior ambiguous.

## Migration / compatibility

This app is still pre-production, so prefer a clean domain model over preserving accidental development semantics.

However:

- migrations must be explicit and reviewed;
- existing completed demo state should remain reproducible through seeds;
- Replay for already-completed lessons must continue to work;
- legacy development attempts may be reset/backfilled rather than forcing awkward permanent compatibility if the seed/dev environment makes that safe.

Do not introduce destructive behavior against an unknown production dataset.

## Non-goals

This iteration does not add:

- offline lesson persistence;
- cross-device Resume;
- Practice;
- Review UI;
- Drag & Drop matching;
- audio/TTS;
- gamification rewards;
- billing;
- analytics dashboards.

The model should merely avoid blocking those future features.

## Implementation decisions

Start requires a requestKey unique to the mounted entry. Retrying that same request returns its ACTIVE run; a new entry uses a new key and abandons any prior ACTIVE. A user lock plus partial unique index protects concurrency.

Confirmed exit sends abandon and navigates immediately, even if the request is offline or hangs. No completion is claimed; the next start performs server-side stale cleanup. No timeout or persistent client resume state is involved.

Review increments by every wrong submission within the completed run, once. Migration/backfill details and preserved legacy Review provenance are documented in database-schema.md.

## Completion boundary: ACTIVE 0–99%, COMPLETED 100%

A pedagogical requirement is a required block whose type is not SUMMARY; a required ACTIVITY also requires a valid submission in this run, regardless of correctness. Required-step counters exclude Summary and optional-only steps. ACTIVE percentage is capped at 99; only a successfully committed COMPLETED run returns 100.

The mutation that satisfies the final requirement (content traversal or activity submission) also consolidates completion in that same transaction. Failure rolls back the final attempt/traversal and all durable effects. Responses include status and completion (the normal Result payload, or null while ACTIVE). A nonempty lesson with no required pedagogical blocks completes during start; empty lessons remain rejected.

Summary is post-completion presentation, excluded from prerequisites and completion validation even if marked required in legacy content. Mobile shows the last feedback, then Summary and Result locally from the persisted completion payload. Neither requires a network call or further submission. Closing after 100% preserves COMPLETED and reopening enters Replay. Back after completion exits directly, without abandonment.

An immediate retry offered on the final feedback is now post-completion: it uses the existing read-only replay check, leaves the run closed and cannot alter its first-attempt score or Review. Earlier retries within ACTIVE runs remain persisted and numbered normally. No new Practice/Review session is introduced.

POST run complete remains an idempotent confirmation/result read for completed runs (and validates eligibility if ACTIVE); mobile does not rely on it to reach completion. Optional unanswered activities remain in the existing score denominator.
