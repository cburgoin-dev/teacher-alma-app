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
- Freemium behavior is the current direction: each available level/course should ideally expose a small useful sample of free content before paid access is required.

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
  - Gamification: coins, streak and achievements.
- Exact coin values are not yet fixed and should be configurable/balanceable.
- Lesson completion may award a base coin reward. A better/perfect result may optionally award a modest bonus, but weaker performance should not punish or block learning.
- Avoid life/heart penalties in the initial MVP unless later validated with the client.
- Gamification should reinforce progress and habit without becoming the sole focus of the learning experience.
- Coins must have a real use if they are present in the MVP; they should not exist merely as a decorative counter.

## Daily goal and streak

- A daily goal may include simple objectives such as completing one lesson and/or a small number of exercises.
- Streak represents consecutive learning days and is currently the primary habit-oriented gamification mechanic.
- Exact streak rules, grace periods and timezone handling remain to be defined before implementation.

## Coins and Shop

### Purpose

Coins are an internal gamification currency earned through learning/progress. The Shop exists to give those coins a small but meaningful use without making the learning experience feel pay-to-win or pay-to-learn.

Current MVP principles:

- Coins are earned through learning-related actions such as lesson completion, goals, streak/milestone achievements and possible performance bonuses.
- Exact earning amounts, prices and rewards are **not yet fixed** and should be balanceable without schema/UI redesign.
- Do not require coins to access normal explanations, basic hints, core exercises or other essential learning support.
- Do not sell additional learning attempts or advantages that would make users feel that the quality of learning depends on spending coins.
- Buying coins with real money is not part of the current MVP direction.

### Shop navigation

The Shop is a **secondary gamification screen**, not a primary app section.

Primary bottom navigation remains:

- `Inicio`
- `Cursos`
- `Progreso`
- `Perfil`

The Shop should therefore **not** be a fifth bottom-navigation tab in the current direction.

Preferred access:

- Tapping the coin balance/counter in a global header where that counter is shown.
- A secondary Shop/rewards entry from Profile may be added later if useful.

### Shop visual/interaction direction

The MVP Shop should be intentionally simple and can fit on one screen:

- Current coin balance.
- A small list of available items/actions.
- Current inventory/status for each item.
- Coin cost.
- One direct purchase/start action.

Separate detail screens for each Shop item are not required for the MVP unless future items become complex enough to justify them.

### Initial item: Streak Protector

Purpose:

- Preserve the learner's streak for a missed day.
- Support habit continuity without affecting access to learning content.

Current provisional behavior:

- Purchased using coins.
- Stored as a consumable inventory item.
- Automatically consumed when the learner would otherwise lose their streak because of one missed eligible day.
- The mockup currently shows a maximum inventory of `2`; exact maximum and price remain balance/configuration decisions.
- The Shop should show status such as `Tienes: 1/2`.

### Initial item/action: 7-Day Streak Challenge

Purpose:

- Encourage the learner to maintain the main habit mechanic for a full week.
- Give coins a second meaningful use without affecting educational content or exercise difficulty.

Current provisional behavior:

- The learner spends a configured amount of coins to begin the challenge.
- Only one 7-day challenge should be active at a time for the MVP.
- The goal is to maintain the streak for seven consecutive days according to the app's streak rules.
- Successful completion grants a configured coin reward/bonus.
- The exact entry cost, reward amount and whether the entry cost is effectively returned as part of the completion reward are balancing decisions, not fixed business rules yet.
- The Shop should expose status such as `Ningún reto activo`, active progress, or completion when relevant.

### Future Shop possibilities

Additional items may be added later only when they provide clear value relative to implementation effort. Possible directions include additional streak/habit tools, light cosmetic rewards or optional game-related uses.

Avoid adding items solely to create a circular economy such as spending coins primarily to multiply future coin earnings.

## Assessments

- Formal assessments should reuse the same activity engine where possible.
- An assessment can differ from normal practice through configuration, for example:
  - feedback at the end rather than immediately;
  - total score;
  - configurable passing threshold;
  - retry rules.

## Premium / payments

### MVP commercial direction

The current provisional commercial model is **freemium + two paid access paths**:

1. **Premium membership/subscription**: access to the set of courses/content included in Premium while the entitlement remains active.
2. **Permanent individual course purchase**: one-time purchase that grants persistent access to that specific course according to the platform/payment entitlement.

Additional rules:

- Free users can access the diagnostic and an initial useful portion of learning content.
- Each available level/course should ideally expose some free lessons/content so a learner can try the recommended level before encountering a purchase decision.
- Selling individual lessons is **not** part of the MVP direction. It creates disproportionate pricing/access complexity and is not currently justified by product value.
- Do not introduce multiple Premium tiers in the MVP unless Alma explicitly requests them later.
- An annual subscription option may be added later, but it is not required for the initial MVP.
- Exact course prices, membership price and the relationship between them remain to be validated with Alma.

### Course purchase versus membership

- Owning a course permanently and having an active Premium membership are different entitlement sources.
- A learner who permanently owns a course keeps access to that course even if a separate Premium subscription expires, subject to store/platform restoration and account-linking rules.
- An active Premium membership can unlock included courses without creating permanent ownership of each course.
- The access layer should be able to answer whether a user can access a course without forcing the UI/business logic to care which valid entitlement source granted that access.
- A future offer may present `Suscripción` and `Compra única` as alternative ways to unlock a course, but the exact purchase UX should be designed only after store/payment constraints and pricing are finalized.

### Paywall behavior

- Premium is **not** a primary bottom-navigation tab.
- The paywall should appear contextually when the learner intentionally reaches paid content or chooses to upgrade.
- Typical entry points:
  - tapping a paid/locked course or lesson;
  - reaching the free-content boundary;
  - an upgrade/manage-access action from Profile in the future.
- Do not show the paywall aggressively on every app launch, Home visit, course-list visit or during free lessons.
- The diagnostic result should remain pedagogically focused and should not become an aggressive purchase screen; it may lead into a recommended course where normal access rules apply.

### Locked content versus Paywall

These are conceptually separate experiences:

- **Locked content state:** explains that a specific item requires paid access and offers an appropriate unlock action.
- **Paywall/purchase choice:** explains available purchase paths, benefits, price and purchase action.

The locked state may route directly to the purchase/paywall flow after the learner chooses to see the offer.

### Paywall content

The current visual/product direction should communicate only benefits actually supported by the chosen paid model and MVP implementation.

For membership, this may include:

- Access to Premium courses/lessons while membership is active.
- Access to newly published content that is included in Premium, without promising a fixed publishing cadence.

For permanent course purchase, the product should clearly communicate that the purchase applies to the selected course rather than all future content.

Relevant actions may include:

- `Suscribirme` / equivalent.
- `Comprar curso` / equivalent.
- `Restaurar compras` where required/appropriate.

Clear renewal/cancellation/ownership wording should follow the final store/provider requirements.

### Entitlements and access

- Paid access must be determined from validated entitlements/purchase state, not only from a local boolean such as `user.isPremium`.
- Learning-progress state and commercial-access state remain separate concepts.
- The access model must support both active subscription-based access and permanent course ownership.
- Conceptual transaction/access states may include:
  - `LOCKED`
  - `PURCHASING`
  - `ACTIVE`
  - `PURCHASE_FAILED`
  - `RESTORING`
  - `EXPIRED` where relevant to subscriptions
- These are conceptual product states and do not necessarily imply one persisted enum/table exactly as written.

### Purchase restoration

- `Restaurar compras` means revalidating access the learner has already purchased through the app-store account; it is not a second purchase.
- It is relevant after reinstalling the app, changing device, signing back in or when local access state is out of sync with the store/provider.
- Restoration should be able to recover both supported subscriptions and permanent course purchases when the final provider/platform supports them.

### Premium active state

After a successful purchase/validated entitlement:

- Content becomes accessible according to the entitlement source.
- The learner may see a concise success/active-state screen or return to the originally requested content.
- A future Profile/account area may expose subscription and owned-course status/actions.

### Payment-provider implementation

Still to be finalized before implementation:

- exact subscription price;
- exact per-course prices;
- exact free-content boundary per course/level;
- renewal/expiration/access behavior;
- whether an annual option launches with the MVP;
- concrete Apple/Google billing and entitlement integration/provider configuration;
- how subscription products and permanent course purchases are represented and restored across platforms.

Do not hard-code mockup prices or illustrative paid benefits as contractual product requirements until they are validated with Alma.
