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

## Lesson model and completion

Current provisional direction:

- Lessons use a **hybrid consumption model**: related explanatory blocks can be grouped into a scrollable content step, while interactive activities are presented as focused steps.
- A lesson should not require one screen per content block, and should also avoid becoming one very long undifferentiated page.
- Conceptual content blocks can include text, video, image, example, activity and summary.
- Blocks have an order and may be required or optional.
- Optional blocks do not prevent lesson completion.
- The learner may revisit previous content within an active lesson.
- Required future content should not be skipped when sequential progression applies.

### Lesson states and resume

- Conceptual lesson states are `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED` and `LOCKED`.
- Leaving an unfinished lesson preserves meaningful progression and submitted attempts.
- Re-entering an `IN_PROGRESS` lesson resumes at the last meaningful current/pending step rather than restarting from the beginning.

### Completion rule

- A lesson is completed when all required content/steps have been traversed and all required activities have been submitted at least once.
- **Correctness is not the same as completion.** A learner can complete a required activity after an incorrect submitted attempt.
- Incorrect answers do not by themselves block lesson completion or progression unless the client later defines an explicit assessment/passing rule.
- Incorrect attempts should be preserved for Review.
- Academic correctness/score and lesson-content progress must remain separate concepts.

### Lesson progress

- The lesson progress indicator reflects progress through lesson content/steps, not percentage of correct answers.
- Block/step progress may conceptually distinguish not visited, current and completed states.
- Activity result may separately distinguish unanswered, correct and incorrect.

### Video behavior

- Do not require 100% video playback by default.
- For the MVP, advancing from a video-containing content step may be sufficient to consider that block traversed unless Alma later asks for stricter viewing requirements.
- If stricter video-completion requirements are introduced, they should be explicit and configurable rather than assumed.

### Summary versus result

- `SUMMARY_STEP` is the final pedagogical step **inside** a lesson.
- Its purpose is to recap key concepts/phrases before the lesson ends.
- The post-lesson **Result** screen is separate and focuses on performance, rewards, progress and next actions.
- Typical transition: `... -> SUMMARY_STEP -> Finalizar lección -> Result`.

## Lesson result / completion feedback

- Result is shown only after the lesson completion conditions have been satisfied and the completion has been persisted.
- The screen communicates completion, academic result, gamification reward, updated course progress, pending review, and the next recommended action.
- Result should generally remain a concise, preferably single-screen experience rather than a long scroll.
- The preferred current visual direction is the balanced `NORMAL` layout; a more celebratory `PERFECT` variant is also acceptable. The denser review-heavy variant should not become the default layout.

### Result variants

Conceptual result variants:

- `NORMAL`: lesson completed with both correct and incorrect submitted answers.
- `PERFECT`: lesson completed with no pending errors / equivalent perfect result.
- `REVIEW_PENDING`: lesson completed but with enough pending errors that Review deserves increased prominence.

These variants are presentation/experience states and do not necessarily require a persisted `result_state` field; they may be derived from attempts and review data.

### Result data

Before Result is rendered, the system should be able to provide or derive:

- Completed lesson identity/title.
- Correct-answer count and relevant activity total.
- Gamification reward earned.
- Current streak when relevant.
- Updated course progress.
- Number of pending review items created by the lesson.
- Whether a next lesson exists and is accessible.

### Result actions

- `Siguiente lección` is the preferred primary CTA when a next accessible lesson exists.
- `Volver a la ruta` remains available as a secondary action.
- `Repasar errores` is shown only when review items exist.
- In `REVIEW_PENDING`, `Repasar errores` receives greater visual prominence but does not automatically replace progression as the primary action.
- If there is no accessible next lesson, the primary CTA must adapt to the situation (for example returning to the route, course completion, or contextual access flow) rather than leading to an unavailable lesson.

### Perfect result and rewards

- A perfect result may use stronger celebratory presentation than a normal result.
- Exact reward bonuses for perfect performance are **not yet fixed**; mockup values such as `+25 monedas` are illustrative only.
- A perfect result with no review items should not show a redundant `Repasar errores` action.

### Review-pending result

- Review items originate from incorrect attempts captured during the lesson.
- A high pending-review count may make the Review section visually more prominent.
- Pending review does not itself invalidate lesson completion.
- Unless a future explicit assessment rule requires otherwise, the learner may proceed to the next lesson even when review items remain.

### Navigation chrome

- Do not assume the global header or bottom navigation appears on Result.
- Result belongs to the immersive learning flow and may intentionally omit logo, notifications, currency/streak indicators and/or bottom tabs.
- Global navigation should be used only where it improves orientation without distracting from the completion flow.

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
- For normal practice, an incorrect answer should not trap the learner until they answer correctly; retry may be offered without making correctness mandatory for progression.

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

### MVP commercial direction

- The current provisional product direction is a **freemium model with one primary Premium subscription**.
- Free users can access the diagnostic and an initial portion of learning content.
- Premium grants access to content/features marked as Premium while the entitlement is valid.
- Do not introduce multiple paid tiers in the MVP unless Alma explicitly requests them later.
- An annual plan may be added later, but it is not required for the initial MVP.

### Paywall behavior

- Premium is **not** a primary bottom-navigation tab.
- The paywall should appear contextually when the learner intentionally reaches paid content or chooses to upgrade.
- Typical entry points:
  - tapping a Premium course/lesson;
  - reaching the free-content boundary;
  - an upgrade/manage-access action from Profile in the future.
- Do not show the paywall aggressively on every app launch, Home visit, course-list visit or during free lessons.

### Locked content versus Paywall

These are conceptually separate experiences:

- **Locked content state:** explains that a specific item requires Premium and offers `Ver planes` / `Desbloquear`.
- **Paywall:** explains the Free/Premium offer, benefits, price and purchase action.

The locked state may route directly to the paywall after the learner chooses to see the offer.

### Paywall content

The current visual/product direction should communicate:

- Free versus Premium access in a mobile-friendly layout.
- One clear Premium price/period once pricing is finalized.
- Benefits such as access to Premium courses/lessons and Premium learning features actually included in the MVP.
- Future-content wording must **not promise a fixed publishing cadence**. Prefer copy such as `Acceso al nuevo contenido que se publique` rather than `Nuevo contenido cada mes`.
- Primary CTA: `Suscribirme` / equivalent.
- Secondary action: `Restaurar compras` where required/appropriate.
- Clear cancellation/renewal information according to store/provider requirements.

### Entitlements and access

- Premium access must be determined from a validated entitlement/subscription state, not only from a local boolean such as `user.isPremium`.
- Learning-progress state and commercial-access state remain separate concepts.
- The backend/app integration should be prepared to handle at least these conceptual subscription/access states:
  - `LOCKED`
  - `PURCHASING`
  - `ACTIVE`
  - `PURCHASE_FAILED`
  - `RESTORING`
  - `EXPIRED`
- These are conceptual product states and do not necessarily imply one persisted enum/table exactly as written.

### Purchase restoration

- `Restaurar compras` means revalidating access the learner has already purchased through the app-store account; it is not a second purchase.
- It is relevant after reinstalling the app, changing device, signing back in or when local access state is out of sync with the store/provider.

### Premium active state

After a successful purchase/validated entitlement:

- Premium-locked content becomes accessible according to the entitlement.
- The learner may see a concise success/active-state screen or return to the originally requested content.
- A future Profile/account area may expose subscription-management status/actions.

### Payment-provider implementation

Still to be finalized before implementation:

- exact subscription price;
- exact free-content boundary;
- renewal/expiration/access behavior;
- whether an annual option launches with the MVP;
- concrete Apple/Google billing and entitlement integration/provider configuration.

Do not hard-code mockup prices or illustrative Premium benefits as contractual product requirements until they are validated with Alma.
