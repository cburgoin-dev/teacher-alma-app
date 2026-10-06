# Current Product Decisions

Last reviewed: 2026-10-06.

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

## Diagnostic v1: build the engine before final pedagogical content is fixed

Diagnostic should be implemented as a complete reusable flow even if Alma has not yet finalized every question, threshold or wording choice.

Direction:

- reuse the existing activity/exercise rendering and answer-validation concepts where appropriate;
- keep question content, ordering, weights, thresholds and recommendation mapping configurable/data-driven;
- support the complete start -> answer -> submit -> result/recommendation lifecycle;
- do not block implementation on final production questions;
- treat final questions, exact count, difficulty progression, recommendation thresholds and pedagogical wording as content/configuration that can be replaced after Alma validates them.

The diagnostic remains optional and recommends a starting level/course; it does not hard-restrict course choice.

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

Known post-v1 visual/product debt includes richer illustration motifs, official Alma character/avatar integration, decorative typography, brand harmonization, real Diagnosis/Practice/Notifications integration and deeper polish of ASSESSED/COURSE_COMPLETED if later justified.

## Progress v1

Canonical product semantics: `docs/progress-semantics-v1.md`.

Progress is the next learner-facing vertical. It is a read-oriented composition over existing Course/Roadmap progress, Review and Gamification data rather than a second progression engine.

Approved v1 direction includes:

- current/recent course progress with `Ver ruta`;
- pending Review/reinforcement summary;
- weekly consistency;
- a separate monthly Activity Calendar;
- calendar distinctions between real learning, Protector-covered dates, repaired dates and unrepaired breaks;
- no Strengths/mastery, Achievements, XP, ranking/social system or fake Practice engine in v1.

Gamification remains authoritative for streak, Daily Goal, coins, inventory and timezone semantics. Protected/repaired continuity dates are not counted as real learning days.
