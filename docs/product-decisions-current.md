# Current Product Decisions

Last reviewed: 2026-10-13.

This document records recent product decisions that supersede older provisional text when there is a conflict. It is intentionally concise and should be reconciled back into the larger domain/screen documents over time.

## Source precedence

For the decisions listed here, this document is the current source of truth when older provisional wording in `docs/business-rules.md`, `docs/screens.md`, `docs/external-costs.md` or historical mobile notes says otherwise.

Domain-specific canonical documents still remain authoritative where explicitly referenced below.

## Lessons: no Resume UX for incomplete normal lessons

Canonical semantics: `docs/lesson-session-semantics-v1.md`.

Teacher Alma lessons are short, focused sessions, generally about 5–15 minutes.

- Entering an incomplete lesson starts a fresh NORMAL lesson run.
- There is no learner-facing Resume flow for an unfinished normal lesson.
- Back/exit asks for confirmation and an accepted exit abandons the run.
- Re-entering after abandonment starts again at the first step with 0% session progress and fresh answers.
- A stale ACTIVE run left by process death or interruption is replaced/abandoned on the next explicit start.
- ABANDONED runs do not consolidate durable score, Review, lesson/course progression or rewards.
- Completed lessons use Replay, which remains a separate read-only learning mode.

Any older `screens.md` or historical `mobile/LESSONS.md` wording that describes persisted step-level Resume for normal incomplete lessons is obsolete.

## Lessons: real video infrastructure is a required production capability

Lessons support VIDEO content conceptually, but real video playback/hosting is not yet production-ready.

This is not merely visual polish. Before Lessons can be considered production-ready with Alma's real content, the project needs a Video Infrastructure vertical or equivalent implementation covering at least:

- a real video hosting/streaming provider;
- media asset lifecycle and identifiers/URLs;
- backend/content contract integration for playable video metadata;
- an in-app mobile video player;
- poster/thumbnail, loading, error and retry states;
- practical full-screen/inline behavior where appropriate;
- access-control compatibility for paid content;
- an operational storage/delivery strategy that does not serve large production videos directly from the Node/Express API server.

Current planning may evaluate Mux or another dedicated video platform. The provider is not locked.

Current lesson completion semantics remain intentionally simple: advancing beyond a video-containing content step can count as traversal for MVP; 100% playback is not required unless Alma later asks for an explicit configurable viewing rule.

## Diagnostic v1: design frozen for Backend implementation

Canonical product semantics: `docs/diagnostic-semantics-v1.md`.
Canonical learner HTTP contract: `docs/diagnostic-api-contract-v1.md`.
Final freeze/review clarifications: `docs/diagnostic-v1-freeze.md`.

Diagnostic should be implemented as a complete reusable flow even if Alma has not yet finalized every production question, threshold, weight, estimated duration or wording choice.

Frozen direction:

- Diagnostic is optional placement/recommendation, not formal CEFR certification.
- Reuse/extract the existing shared Activity rendering and answer-validation engine; do not build a second Diagnostic-specific evaluator.
- Keep question content, ordering, weights, thresholds and recommendation mapping configurable/data-driven.
- Use the complete configured question set in deterministic position order for v1; no random subset or adaptive/IRT engine.
- There is no learner-facing Resume in v1. Confirmed exit abandons the ACTIVE attempt; a genuine later start begins a fresh attempt.
- Network retries are still idempotent. A request key is a transport boundary, not a Resume token.
- Retakes are supported with no v1 cooldown. Each retake creates a new attempt; the latest COMPLETED attempt is the current result.
- Starting/abandoning a retake does not erase the prior COMPLETED result.
- No correctness feedback, answer editing, pedagogical retry, Skip or `No sé` while the attempt is active.
- Diagnostic does not create Review debt, LearningDays, coins/streak/Daily Goal progress or normal course/lesson progression.
- Diagnostic never auto-starts a course. Recommendation routes into existing Course Detail/Courses/Roadmap ownership.
- `estimatedMinutes` is optional editorial metadata so Mobile/demo states can render production-like duration copy before Alma fixes the final value; it is not a timer.
- Diagnostic availability is backend-authoritative and should be exposed only when the current published definition can make a useful choice between at least two learner-facing `PUBLISHED` entry levels.
- Every recommendation level reachable by a learner-facing published Diagnostic must resolve to a current learner-facing `PUBLISHED` course at publication/availability time. Premium access does not invalidate an academic destination; `COMING_SOON` does.
- At most one Diagnostic definition is current `PUBLISHED` for new starts. Material academic changes require a new version; historical/published academic meaning is immutable.
- An ACTIVE attempt remains bound to its original Diagnostic version and may finish against it even if a newer version becomes current while the learner is taking the test.
- Weighted scores and threshold comparisons use exact decimal arithmetic. Recommendation rules compare against unrounded scores; storage/display rounding happens afterwards.
- A completed attempt preserves historical `recommendedLevel` and `recommendedCourseId`; current result rendering hydrates current Courses progress/access/visibility without inventing a parallel Diagnostic course state.
- Courses already referenced by completed Diagnostic history should be retired by status/visibility rather than physically deleted; Backend v1 should use restrictive FK deletion behavior instead of clearing historical `recommendedCourseId`.
- Home keeps `ACTIVE > COURSE_COMPLETED > ASSESSED > NEW` precedence. Home NEW must receive backend-authoritative `diagnosticAvailable` rather than making Mobile infer eligibility.

Final production questions, exact count, difficulty progression, weights, thresholds and pedagogical wording remain replaceable/configurable after Alma validates them. Do not block Backend v1 on final content authoring.

Older provisional `docs/data-model.md` wording that models `diagnostic_answers.activity_id` directly is obsolete for v1. Current/canonical persistence is `DiagnosticAnswer -> DiagnosticQuestion -> Activity`, matching Prisma/database schema and the frozen Diagnostic documents.

## Monetization v1: subscription-first MVP

The current MVP commercial direction is:

- freemium entry/content sampling;
- one Premium membership/subscription as the paid access path;
- no permanent individual-course purchase flow in the initial MVP;
- no sale of individual lessons;
- no multiple Premium tiers unless later requested.

Older provisional text describing `subscription + permanent course purchase` as two simultaneous MVP purchase paths is no longer the active product direction.

### Future extensibility

Permanent individual-course purchase is deferred, not architecturally forbidden.

Access/entitlement code should remain extensible enough that a future version could add course ownership without rewriting learning progression or coupling UI directly to a single boolean such as `isPremium`.

For MVP implementation, however:

- do not build purchase-course UI;
- do not require permanent-course ownership tables/flows solely for hypothetical future use;
- do not show `Comprar curso` as an active product path;
- keep commercial access separate from learning-progress state;
- subscription entitlement remains the real paid-access source for v1.

If course purchase is revisited later, it should be added as another entitlement source behind the existing access layer.

## Navigation debt after Home v1

Home v1 exposed an important navigation/chrome issue around Roadmap.

Current intended follow-up is a dedicated navigation/refactor iteration, separate from Home visual work, to evaluate/implement:

- Roadmap remaining within the global tab experience so the learner can move directly among Inicio/Cursos/Progreso/Perfil;
- preserving origin-aware Back behavior (`Home -> Roadmap -> Back -> Home`, `Courses -> Roadmap -> Back -> Courses`);
- keeping Lesson, Unit Challenge, Result and similar focused learning flows immersive without bottom tabs;
- aligning the global header-actions area (future notifications, coins, streak) between section headers and Roadmap without forcing the full brand logo into Roadmap;
- protecting currentNode focus, Roadmap motion and completion-ticket behavior during any navigator refactor.

Do not implement this as a fake bottom bar inside Roadmap; treat it as navigation architecture.

## Home v1 status

Home Backend v1 and Home Mobile v1 are accepted as closed for the current MVP pass.

The development-only Home state preview remains useful for regression/design checks and must not affect production data or behavior.

Diagnostic Backend v1 is allowed to make the narrowly required Home integration change for backend-authoritative Diagnostic availability and recommendation truth. This is integration with a newly implemented domain, not a reopening of Home visual/product architecture.

Known post-v1 visual/product debt includes richer illustration motifs, official Alma character/avatar integration, decorative typography, brand harmonization, real Practice/Notifications integration and deeper polish of ASSESSED/COURSE_COMPLETED if later justified.

## Progress v1 status

Canonical product semantics: `docs/progress-semantics-v1.md`.
Canonical HTTP/read-model contract: `docs/progress-api-contract-v1.md`.
Closure note: `docs/progress-v1-closure.md`.

Progress Backend v1 and Progress Mobile v1 are accepted as **closed for the current MVP pass**.

Accepted v1 includes:

- current/recent learner-visible course progress with `Ver ruta`;
- real pending/clear Review projection;
- Monday-Sunday weekly consistency;
- a separate monthly Activity Calendar;
- calendar distinctions between real learning, Protector-covered dates, repaired dates and unrepaired breaks;
- no Strengths/mastery, Achievements, XP, ranking/social system or fake Practice engine in v1;
- DEV-only rich-state previews for regression/design checks without production-data mutation.

Gamification remains authoritative for streak, Daily Goal, coins, inventory and timezone semantics. Protected/repaired continuity dates are not counted as real learning days.

Known post-v1 debt is intentionally deferred and does not block closure:

- canonical Topic visual identity/icon metadata shared across Courses, Roadmap, Review, Progress and future Practice;
- shared skeleton/stale-while-refresh loading treatment across read-heavy screens;
- broader release/accessibility QA for large system fonts, TalkBack and very narrow devices;
- optional future icon polish for continuity states;
- real Practice integration and broader Gamification v2 concepts.

Do not reopen Progress v1 architecture or semantics for small cosmetic experimentation; use a clearly scoped follow-up/polish task when one of these deferred items becomes valuable enough.
