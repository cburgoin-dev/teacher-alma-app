# Business Rules

This document records agreed or provisional product rules for the MVP. Rules may evolve after further client validation.

## Placement / diagnostic test

- The diagnostic test is **optional**, not mandatory.
- It should be strongly recommended to new users because it can suggest a starting level/course.
- A user may skip the diagnostic and browse/start a course directly.
- If a user starts a course without taking the diagnostic, Home should switch from the NEW state to the ACTIVE state.
- The diagnostic should remain available later from a secondary area such as Profile/Level or Courses.
- Completing the diagnostic should produce a recommendation, not a hard restriction. Users should still be able to choose a course manually.

## Home hero

- Home has one main hero area.
- The hero is **not** an automatic carousel.
- Its content changes according to the user's learning state.
- Typical derived states:
  - NEW: no diagnostic and no course started.
  - ASSESSED: diagnostic completed, no course started.
  - ACTIVE: course/lesson in progress.
  - COURSE_COMPLETED: active course completed and no next course started.
- These states are conceptual and do not necessarily imply a persisted `home_state` database column; the backend may derive them from actual user data.

## Course access and progression

- Course structure is currently `Course -> Topic/Unit -> Lesson`.
- Courses and lessons have separate **learning-progress state** and **commercial access state**. These concepts should not be collapsed into one status.
- A course can conceptually be available, in progress, completed, access-locked or coming soon.
- Lesson roadmap nodes can conceptually be completed, current, available, prerequisite-locked or access-locked.
- Completed lessons should remain accessible for repetition/review.
- A prerequisite lock means learning progression requirements are not satisfied.
- An access lock means the learner does not have the required entitlement/payment access.
- The UI may use a similar lock icon for both, but the reason and resulting action must be different.
- Freemium behavior is a likely direction: some initial content can be accessible before paid access is required.

### Sequential progression

Current provisional direction:

- The course roadmap progresses sequentially.
- Completing the required content of the current lesson unlocks the next required lesson.
- Do not hard-code a minimum score as an unlock requirement until this is validated with the client.
- Exact free-navigation versus strict-sequential behavior remains a client-validation item.

### Course start and resume

- Starting a course creates/establishes learner progress for that course.
- Home should then treat the learner as active and surface the current lesson.
- Home's `Continuar` action may navigate directly to the current lesson instead of forcing the user through Courses -> Detail -> Roadmap.
- Course cards in the Courses area normally open Course Detail.

### Course completion

- A course is completed when all lessons required by that course have met their completion conditions.
- The completed course and roadmap remain accessible for review.
- Completing a course should not automatically imply ownership/access to a subsequent premium course.

## Course catalog and detail

- Course cards should expose useful learning/access context such as level, progress and availability.
- Level labels (A1, A2, etc.) should be shown when applicable.
- `COMING_SOON` content should be visible only when it provides useful product context; it must not look actionable as if it were already available.
- Course Detail provides the main action appropriate to state: start, continue/view route, review, unlock, or unavailable/coming soon.

## Lesson completion

Provisional rule:

- A lesson is completed when all required lesson blocks and required activities have been completed.
- Video completion requirements are not yet fixed and should not be assumed to require 100% playback unless the client requests it.
- Optional blocks should not prevent lesson completion.

## Practice activities

Initial activity types:

- Multiple choice.
- Fill in the blank / typed answer.
- Match word with image.

Shared rules:

- Practice activities may be retried.
- Correct/incorrect feedback is immediate unless the activity belongs to an evaluation configured to defer feedback.
- Incorrect attempts should be stored so they can later be surfaced in Review.
- Explanations are shown when useful.

### Fill-in-the-blank answers

- Basic answer comparison should tolerate leading/trailing whitespace.
- Case sensitivity should be configurable or ignored when it is not pedagogically relevant.
- An activity may support multiple accepted answers.

### Matching

- Initial mobile interaction should prefer tap-to-match over mandatory drag-and-drop.

## Review / error practice

- Review should reuse the existing activity rendering system instead of introducing a completely separate exercise engine.
- Users should be able to revisit previously incorrect concepts/questions.
- A user with no previous mistakes should not see a pending-review card on Home.

## Scoring and gamification

- Academic score and gamification rewards are separate concepts.
- Example distinction:
  - Score: 8/10 correct answers.
  - Gamification: +XP / coins.
- Exact XP/coin values are not yet fixed.
- Avoid life/heart penalties in the initial MVP unless later validated with the client.
- Gamification should reinforce progress and habit without becoming the sole focus of the learning experience.

## Daily goal and streak

- A daily goal may include simple objectives such as completing one lesson and/or a small number of exercises.
- Streak represents consecutive learning days.
- Exact streak rules, grace periods and timezone handling remain to be defined before implementation.

## Assessments

- Formal assessments should reuse the same activity engine where possible.
- An assessment can differ from normal practice through configuration, for example:
  - feedback at the end rather than immediately;
  - total score;
  - configurable passing threshold;
  - retry rules.

## Premium / payments

Still to be finalized:

- subscription versus course purchase versus hybrid model;
- free-content boundary;
- expiration/access behavior;
- restoration of purchases;
- app-store/payment-provider implementation constraints.

Do not implement these rules as fixed assumptions until they are validated.
