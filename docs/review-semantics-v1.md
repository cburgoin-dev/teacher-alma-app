# Review Semantics v1

This document is the source of truth for the MVP Review vertical. It defines the learner-facing semantics, lifecycle and boundaries of saved-error review. Review is intentionally separate from normal Lessons, Lesson Replay, future free Practice and future Assessments.

## Purpose

Review turns durable mistakes from completed normal lessons into short reinforcement checks. It verifies whether the learner can now answer without hints or an immediate retry loop.

Review is not:
- a replay of a full lesson;
- a replacement for lesson score/progression;
- free Practice;
- a unit assessment;
- a second activity engine.

It reuses the existing activity definitions, answer validation and presentation components where practical.

## Source of Review items

Only incorrect submissions belonging to an accepted, COMPLETED normal LessonRun can create or reactivate Review.

Do not create or reactivate Review from:
- ACTIVE or ABANDONED LessonRuns;
- Lesson Replay;
- Review itself;
- future Practice.

One user has one Review lifecycle per activity. Multiple incorrect submissions increase historical difficulty data but do not create duplicate pending exercises.

When a completed normal run contains new incorrect submissions:
- no existing item -> create ACTIVE;
- existing ACTIVE -> keep ACTIVE and increment incorrectAttempts;
- existing RESOLVED -> reactivate it as ACTIVE, clear resolvedAt and increment incorrectAttempts.

A database-level unique constraint on (userId, activityId) is required when Review v1 is implemented.

## States

ReviewItem:
- ACTIVE: still needs reinforcement.
- RESOLVED: answered correctly in Review.

Transitions:
- ACTIVE + correct Review answer -> RESOLVED.
- ACTIVE + incorrect Review answer -> ACTIVE.
- RESOLVED + later qualifying normal-lesson error -> ACTIVE.

lastReviewedAt records a valid Review submission. resolvedAt is set on successful resolution and cleared on reactivation.

incorrectAttempts counts incorrect submissions associated with the item's learning/review history. It is retained for analytics/future adaptation and is not a count of pending exercises.

## Eligibility and commercial access

An ACTIVE ReviewItem is eligible for a new Review batch only when its source content is currently learner-visible and commercially accessible.

FREE source lesson -> eligible.
PAID source lesson + valid entitlement -> eligible.
PAID source lesson without valid entitlement -> remains ACTIVE but is not eligible.

Blocked items are not deleted or silently resolved. If access returns, they become eligible again.

Commercial eligibility is checked when the batch starts. A learner who successfully starts a batch may finish that already-authorized batch even if the entitlement expires while the short Review flow is in progress. New batches must evaluate current access again.

Review does not re-apply roadmap prerequisite locks to previously learned content.

## Batch model

Review v1 uses an ephemeral batch, not a persisted ReviewSession table.

Maximum batch size: 5.
Minimum: 1 pending eligible item. There is no accumulation threshold.

Default global priority:
1. ACTIVE items with lastReviewedAt = null;
2. then least recently reviewed first;
3. createdAt ascending;
4. id as final stable tie-breaker.

incorrectAttempts does not affect ordering in v1.

The selected item list is frozen for the lifetime of the mounted Review flow. The UI may therefore show stable progress such as 2 de 5.

Starting a batch returns an opaque short-lived batchToken proving which ReviewItems were authorized at start. The token is scoped to the authenticated user and exact item ids. Review v1 does not require a persisted ReviewSession/ReviewSessionItem model.

If the learner exits midway:
- already submitted answers remain durable;
- resolved items stay RESOLVED;
- incorrect items stay ACTIVE;
- unseen items remain unchanged;
- the next entry builds a fresh batch from current state.

## Contextual entry from Lesson Result

The only initially implemented learner entry point is Lesson Result when the just-completed lesson produced at least one pending Review item.

Lesson Result communicates a lesson-local count, for example:
"1 ejercicio de esta lección para reforzar".

Review READY communicates the current global eligible count.

When a batch starts from Lesson Result, the completed lesson is a preferred source:
1. eligible ACTIVE items from that lesson are selected first using the normal priority rules;
2. remaining slots up to 5 are filled from the global queue;
3. no item is duplicated.

This is still the same Review flow, not a special lesson-only Review mode.

Home and Progress remain planned Review entry points. When those verticals are implemented they may start the same global Review flow without a preferred lesson.

## Review activity interaction

Review reuses the supported activity families and server-side answer checker:
- MULTIPLE_CHOICE;
- FILL_BLANK_OPTIONS;
- FILL_BLANK_TEXT;
- MATCH_WORD_IMAGE.

Review keeps:
- activity prompt/instruction;
- structured context (text/dialogue/image);
- configured media/audio when available;
- normal answer selection/input interaction;
- Comprobar;
- immediate correct/incorrect visual feedback;
- correct answer disclosure after submission when supported;
- configured explanation after submission;
- focused sticky primary action where appropriate.

Review removes:
- lesson content steps;
- lesson Summary;
- lesson score/progression concepts;
- hints/Pista, even if the source activity has a hint;
- immediate Intentar de nuevo.

Correct Review answer:
- persist REVIEW ActivityAttempt;
- set lastReviewedAt;
- mark ReviewItem RESOLVED;
- set resolvedAt;
- show feedback, then Continuar.

Incorrect Review answer:
- persist REVIEW ActivityAttempt;
- set lastReviewedAt;
- increment incorrectAttempts;
- keep ReviewItem ACTIVE;
- show correction/explanation, then Continuar.

The learner proves retention in a later Review batch rather than retrying immediately after seeing the answer.

Review attempts never create another ReviewItem.

## ActivityAttempt in Review

A valid Review submission creates an ActivityAttempt with:
- context = REVIEW;
- reviewItemId = current item;
- activityId = item activity;
- lessonId = sourceLessonId when available;
- runId = null;
- answerData = normalized submitted answer;
- isCorrect;
- attemptNumber sequential for that ReviewItem's Review attempts.

Review attempts do not alter the original lesson score.

Each Review submission must be idempotent. Mobile creates a stable requestKey per logical submission and reuses it only when retrying the same network request. Repeating a requestKey must return the same logical result without a second ActivityAttempt or second state transition. The implementation may add the smallest persistence field/constraint needed to guarantee this.

## Atomicity and concurrency

A valid Review submission is one atomic write:
- validate authenticated ownership;
- validate batch authorization and item membership;
- validate current item state;
- validate answer;
- create/reuse idempotent ActivityAttempt;
- update ReviewItem timestamps/counters/status;
- return feedback/current pending count.

A correct answer must not be persisted without the RESOLVED transition, and a transition must not happen without its corresponding attempt.

Concurrent/replayed requests must not double-count attempts or incorrectAttempts.

If the item was already resolved by another authorized request/device before this submission, return a stable conflict/not-active result and let Mobile skip it safely.

## Review flow states

### EMPTY

No currently eligible ACTIVE ReviewItems.

Keep the state lightweight and positive, for example:
"Todo al día. No tienes ejercicios pendientes por reforzar."

### READY

Shows the current eligible pending count and groups by real Topic data. Do not invent skills/concepts/tags only to match mockups.

Typical content:
- "X ejercicios para reforzar";
- Topic rows with counts;
- Empezar repaso.

Mockup counts are visual examples, not product rules.

### IN_PROGRESS

Focused learning flow with reduced chrome:
- header "Repaso";
- current position, for example 2 de 5;
- progress bar based on batch traversal, not correctness;
- optional compact Topic context when useful;
- reused Activity presentation;
- no hints;
- no retry;
- Comprobar -> feedback -> Continuar.

Global bottom tabs are hidden while actively reviewing.

Back during IN_PROGRESS opens a lightweight confirmation modal. Suggested meaning:
"¿Salir del repaso? Tus respuestas ya guardadas se conservarán y podrás continuar repasando después."

The modal protects against accidental exit; it does not imply a persisted resumable session. Confirmed exit simply leaves the flow.

No exit confirmation is required on READY or RESULT.

### RESULT

Summarizes the batch actually traversed, not the learner's lifetime history.

May show:
- corrected/resolved count in this batch;
- answered-but-still-pending count;
- Topics reviewed;
- optional current global eligible pending count if useful.

For the initial Lesson Result entry, the primary exit returns to the learning route/current course context. Future Home/Progress entry points may choose context-appropriate return navigation.

## Progress semantics

Review progress means position through the frozen batch, never percent correct.

Example:
2 of 5 traversed -> 40%.

A wrong answer still advances the Review flow after feedback; it remains ACTIVE for a future batch.

## Boundaries

Review never mutates:
- LessonRun lifecycle;
- LessonProgress;
- LessonBlockProgress;
- CourseProgress;
- course/lesson unlocking;
- original lesson score;
- Replay state.

Review v1 also does not award or update:
- coins;
- streaks;
- daily goals;
- achievements.

Those belong to Gamification rules when that vertical is implemented.

## Future boundaries

Free Practice is a separate future vertical. It may reuse the same activity engine/components, but it does not depend on ReviewItem and must not inherit Review's error lifecycle automatically.

Unit/topic checkpoints, examinations or mini-game challenges belong to future Assessment/Challenge design. Existing ActivityAttempt context leaves room for ASSESSMENT, but Review v1 does not define that vertical.

Advanced Review features such as spaced repetition, skill mastery, adaptive frequency, generated variants and difficulty-weighted prioritization are intentionally deferred.
