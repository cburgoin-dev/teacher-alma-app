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
- Lessons may have access states such as available, in progress, completed or locked.
- Monetization/access rules are still provisional and will be finalized after client validation.
- Freemium behavior is a likely direction: some initial content can be accessible before paid access is required.

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
