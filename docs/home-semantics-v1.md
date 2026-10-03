# Home Semantics v1

This document is the product/behavior source of truth for Home v1. It refines the broader Home notes in `docs/screens.md` and `docs/business-rules.md` without replacing the domain sources owned by Courses, Review, Gamification or the future Diagnostic/Practice verticals.

Home is a read-oriented orchestration surface: it tells the learner what to do now, summarizes a small amount of useful context and routes into existing learning flows. It must not become a second Courses catalog, a second Progress dashboard or a second Roadmap implementation.

## 1. Core principles

- Home has one dominant hero and two compact secondary cards.
- The hero is not a carousel. Its content is derived from the learner's current state.
- Home state is derived from durable domain facts; do not add a persisted `home_state` field merely for UI convenience.
- The backend decides the learner-facing Home state, active/completed course context and canonical current progression node. Mobile renders those decisions and must not independently reimplement progression rules.
- Gamification remains its own shared app resource/source of truth. Home consumes the shared Mobile Gamification state rather than owning separate coins, streak or Daily Goal state.
- Opening Home is not itself a learning action and must not mutate progression, Review, Gamification, entitlements or Diagnosis.
- Mockups are visual references, not contracts for fabricated data or unsupported controls.

## 2. Shared Home composition

All Home states use the same overall composition:

1. shared section/global header;
2. greeting;
3. one dominant state-driven hero;
4. two secondary cards;
5. a small `Explorar cursos` section;
6. global bottom navigation.

Home is vertically scrollable. The first viewport should prioritize the header, greeting and hero.

### Shared header

The Home header should remain visually stable across `NEW`, `ASSESSED`, `ACTIVE` and `COURSE_COMPLETED`.

Current v1 direction:

- official horizontal La Teacher Alma brand mark;
- real coin balance from shared Gamification state;
- real streak from shared Gamification state;
- a profile/avatar visual placeholder is acceptable for layout fidelity before real avatar management exists;
- Notifications are a future vertical/product capability. The layout may reserve/adapt for them, but Home v1 must not fabricate unread counts or functional notification behavior.

A non-functional avatar used only for visual fidelity must not imply account/profile behavior that does not exist yet. Likewise, an unsupported notification affordance must not be presented as an actionable control unless its behavior is implemented.

### Greeting

Greeting copy should be simple and deterministic in v1.

- Prefer the learner's `displayName` when available.
- Avoid generated motivational copy or changing slogans that create unnecessary product/state complexity.
- State-specific subtitle copy may change when it helps explain the next action.

## 3. Derived Home states

Home v1 uses four conceptual states:

- `NEW`
- `ASSESSED`
- `ACTIVE`
- `COURSE_COMPLETED`

They are derived with the following precedence:

1. If at least one course is `IN_PROGRESS` -> `ACTIVE`.
2. Otherwise, if at least one course is `COMPLETED` -> `COURSE_COMPLETED`.
3. Otherwise, if a completed Diagnostic attempt exists -> `ASSESSED`.
4. Otherwise -> `NEW`.

Consequences:

- Diagnostic completed + course in progress -> `ACTIVE`.
- Course completed + Diagnostic completed + no course in progress -> `COURSE_COMPLETED`.
- User may skip Diagnostic and immediately become `ACTIVE` after intentionally starting a course.
- Completing Diagnostic never forces the learner to start the recommended course.

Do not persist this precedence as a separate mutable state machine if the same truth can be derived from domain records.

## 4. Course context selection

### Active course

If multiple courses are `IN_PROGRESS`, Home uses the course with the most recent **durable learning activity**.

Relevant learning activity includes persisted learning events such as:

- completed normal Lesson learning;
- completed Unit Challenge learning;
- future durable course-associated learning sessions that are explicitly integrated into progression/Home semantics.

Merely opening Course Detail, opening Roadmap or browsing the catalog does not change the active course.

If multiple in-progress courses cannot be distinguished by durable learning activity yet, use the most recently intentionally started course as the fallback/tie-breaker.

The implementation should prefer existing durable timestamps/events over adding a `last_active_course_id` field solely for Home. Add new persisted state only if derivation proves ambiguous or disproportionately expensive.

### Recently completed course

When there is no in-progress course and Home is `COURSE_COMPLETED`, the hero uses the most recently completed course as its completion context.

Completing a course does not automatically start, activate or grant access to the next course.

## 5. State: NEW

### Conditions

- no course is in progress;
- no course has been completed;
- no completed Diagnostic attempt exists.

### Hero

Purpose: strongly recommend placement without blocking the learner.

Suggested content direction:

- eyebrow: `TU PRIMER PASO`;
- title: `Descubre tu nivel`;
- brief explanation that a short diagnostic can recommend a starting level/course;
- primary CTA: `Hacer diagnóstico`.

The Diagnostic is **optional**. The learner may skip it and start a course manually.

### Secondary cards

Keep two cards for visual stability.

- `Empieza con A1` (or the first valid beginner entry course supported by real catalog data), offering a direct alternative to Diagnosis.
- `Tu primera meta`, showing the real shared Daily Goal state.

Do not invent A1 if the catalog/content configuration does not expose an appropriate beginner course.

### Explore Courses

Show a small number of real catalog cards and a `Ver todos` action into Courses.

## 6. State: ASSESSED

### Conditions

- no course is in progress;
- no course has been completed;
- a completed Diagnostic attempt exists.

### Diagnostic semantics

Diagnostic belongs to its own vertical slice. Home v1 may depend on its conceptual contract before that vertical is implemented.

Diagnostic produces a recommendation, not a restriction.

Home only needs a compact result projection, conceptually including:

- Diagnostic completed;
- recommended level when available;
- recommended course when available;
- completion/reference identity needed to navigate to a future detailed result.

Detailed skill breakdown, scoring internals and question history belong to Diagnostic/Progress, not Home.

### Hero

Purpose: convert the recommendation into a clear next action.

Show:

- recommended level/course;
- concise explanation;
- primary action to start/view the recommended course according to its real access state.

If the recommended course requires paid access, preserve the pedagogical recommendation and show the appropriate access action. Do not downgrade the recommendation merely because another course is free.

The learner may ignore the recommendation, choose another course and become `ACTIVE` when that course is intentionally started.

### Secondary cards

Keep two cards:

- compact `Ver resultado` / Diagnostic-result summary slot;
- `Meta diaria` from shared Gamification state.

Until the detailed Diagnostic result screen exists, the result card may be a non-interactive visual summary; it must not present a dead CTA.

### Explore Courses

Show a small number of real courses. The recommended course may receive a `Recomendado` treatment, but Home must not reorder or misrepresent catalog/access truth in a way that conflicts with Courses.

## 7. State: ACTIVE

### Conditions

At least one course is `IN_PROGRESS`.

### Hero: Continue learning

The hero represents the active course and the canonical required progression frontier already owned by Courses/Roadmap.

Show when available:

- active course identity/level;
- current Topic/unit;
- canonical current required progression node;
- node type (`LESSON` or `UNIT_CHALLENGE`);
- node title;
- course required-progression percentage;
- contextual course artwork;
- primary action appropriate to progression/access state.

The canonical node must match Roadmap `currentNode`; Home must not calculate a competing next-step algorithm.

#### Accessible current node

The primary action may navigate directly to the current Lesson or Unit Challenge instead of forcing the learner through Courses -> Course Detail -> Roadmap.

#### Current node blocked by commercial access

Keep the same curricular current node. Home must not silently recommend a different academic node merely to avoid the access lock.

The hero should communicate the access restriction and use an access-oriented action such as `Ver acceso` when that flow exists.

Commercial access and learning progression remain separate concepts.

### Secondary cards

Home keeps two secondary cards because the stable two-card composition is part of the accepted visual direction.

#### Slot 1: Review / Practice

Priority:

1. If real pending Review items exist -> show `Repaso` with real pending count and route to Review.
2. Otherwise -> show a `Practice`/practice-oriented visual card.

Practice is a future vertical. For Home v1, this fallback card may exist purely to establish the intended composition, similarly to other visual placeholders already used in the product, but it must not fabricate progress/rewards or expose a misleading dead CTA. It may be explicitly non-interactive/coming-soon until Practice exists.

Review always takes priority over the Practice placeholder when pending Review work exists.

#### Slot 2: Daily Goal

Show real shared Gamification state:

- preset/label when useful;
- current progress;
- target;
- completion state.

Home does not own or duplicate Daily Goal state. Daily Goal configuration remains a future Profile/settings concern unless separately defined.

### Explore Courses

Show approximately two visually rich real course cards, consistent with the accepted mockup direction, plus `Ver todos` -> Courses.

This is discovery/context, not a duplicate full catalog.

## 8. State: COURSE_COMPLETED

### Conditions

- no course is currently `IN_PROGRESS`;
- at least one course is `COMPLETED`.

### Hero

Purpose: preserve the significance of the completed course while offering a useful next direction.

Show:

- recently completed course;
- clear completion/100% treatment;
- concise celebratory copy;
- recommendation for a logical next course when one exists;
- access-aware action if the recommended next course is restricted.

The recommended next course is **not** automatically made active. It becomes active only after the learner intentionally starts it.

If no next published/appropriate course exists, keep the completion state and offer an appropriate review/practice direction supported by real features. Do not fabricate unavailable future content.

### Secondary cards

Keep the same two-card rhythm as ACTIVE:

- real Review when pending, otherwise Practice visual fallback;
- real Daily Goal.

### Explore Courses

Continue to show real discoverable catalog content. The next logical/recommended course may receive visual emphasis when supported by catalog data.

## 9. Review and Practice relationship

Review is durable, data-backed remediation from learner errors and remains its own feature.

- Home may show pending Review count.
- `Repaso` should route into the existing Review flow when pending content exists.
- Do not show fabricated Review counts.

Practice is separate from Review and remains future scope.

- Home's Practice fallback exists to preserve the accepted two-card visual composition when Review is empty.
- The fallback does not create a Practice backend contract, fake sessions, fake rewards or fake progress.
- Once Practice receives its own vertical slice, Home can replace the placeholder with real Practice state/action without changing the two-card layout concept.

## 10. Gamification relationship

Gamification is shared application state, not Home-owned state.

Home consumes the same Mobile Gamification resource used by other app surfaces for:

- coins;
- streak;
- Daily Goal;
- future relevant aggregate fields.

`GET /me/gamification` remains the authoritative Gamification contract unless a future bootstrap optimization intentionally hydrates that same shared resource.

A future Home endpoint should not create an independent copy of Gamification semantics. If a bootstrap response ever embeds a Gamification snapshot for request-efficiency, Mobile must hydrate the same shared Gamification resource rather than maintain a Home-specific fork.

After Lesson/Unit Challenge/Review completion, mutation responses and/or controlled shared-resource invalidation/refresh must keep app-visible state coherent. Simply navigating to Home must not be the sole mechanism by which shared state becomes correct.

## 11. Featured courses

Home should expose a small discovery subset, not rebuild the full Courses catalog.

Current direction:

- approximately two course cards in the normal phone layout;
- real level/title/art/access/progress data only;
- `Ver todos` navigates to Courses;
- card destination follows existing course-state navigation rules;
- `COMING_SOON`, Premium/access and progress must remain truthful.

Exact backend selection/order may be defined in the Home API contract, but should remain deterministic and based on real catalog/course state.

## 12. Navigation summary

- `NEW` Diagnostic CTA -> future Diagnostic flow.
- `NEW` start-course alternative -> existing Course start/detail flow as appropriate.
- `ASSESSED` recommended-course CTA -> recommended course start/detail/access flow.
- `ACTIVE` accessible current Lesson -> Lesson flow.
- `ACTIVE` accessible current Unit Challenge -> Unit Challenge flow.
- `ACTIVE` access-blocked current node -> contextual access flow when implemented.
- Review card -> Review.
- Course cards -> existing Course Detail/Roadmap destination rules.
- `Ver todos` -> Courses.
- Completed-course recommendation -> next course detail/start/access flow; never auto-start.

Home remains in the global bottom-navigation shell.

## 13. Home backend/read-model direction

Home v1 is expected to have an authenticated read-oriented aggregate endpoint, provisionally:

`GET /me/home`

The endpoint should compose the Home-specific read model from existing domain sources instead of forcing Mobile to make several requests and duplicate selection rules.

It should be responsible for deriving, at minimum:

- Home state;
- learner display identity needed by Home;
- active or recently completed course context;
- canonical Home hero projection;
- pending Review summary needed by Home;
- compact featured-course projections;
- compact Diagnostic recommendation projection when applicable.

Gamification should remain separate/shared as described above.

The exact HTTP payload is intentionally **not frozen in this semantics document**. It must be defined next in `docs/api-contracts.md` after repository/query feasibility is checked.

## 14. Persistence guidance

Prefer derivation from current durable domain records.

Do not add solely for Home without demonstrated need:

- `users.home_state`;
- `users.current_course`;
- `users.last_active_course_id`.

Before adding persistence, inspect whether active-course recency and completed-course recency can be derived reliably from existing CourseProgress, LessonRun, Unit Challenge run/progress and other approved durable learning timestamps/events.

A denormalized pointer may be considered later only if correctness, ambiguity or query cost justifies it.

## 15. Loading, refresh and consistency expectations

Home should render coherent last-known/shared data rather than visually resetting global values every time the tab mounts.

- Shared Gamification metrics should use the shared resource/cache behavior already established by Gamification v1.
- Home-specific read data may be refreshed on appropriate app/focus boundaries, but avoid turning tab navigation into a cascade of independent domain fetches.
- Refresh must not create domain side effects.
- Error/loading UI must not fabricate Home state or progression.

## 16. Explicitly deferred from Home v1

The following are not silently part of Home v1 implementation:

- Diagnostic flow/question engine/result-detail implementation;
- real Practice sessions;
- functional Notifications/inbox/push behavior;
- real avatar upload/selection/profile navigation behavior;
- Daily Goal configuration UI;
- Progress dashboard implementation;
- payments/access purchase implementation beyond consuming existing access truth;
- AI-generated recommendations/copy;
- automatic next-course enrollment;
- persistence added only to simplify presentation.

These features may later integrate with Home through the stable slots and derived-state rules defined here.
