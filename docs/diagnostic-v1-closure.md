# Diagnostic v1 closure

Status: **CLOSED for the current MVP pass**.

Diagnostic Backend v1 and Diagnostic Mobile v1 are accepted as complete for the current vertical-slice pass. This note records the accepted boundary and the debt intentionally deferred so future work does not reopen the slice for minor cosmetic experimentation.

Canonical behavior remains defined by:

- `docs/diagnostic-semantics-v1.md`;
- `docs/diagnostic-api-contract-v1.md`;
- `docs/diagnostic-v1-freeze.md`.

Implementation details remain documented in:

- `backend/src/modules/diagnostics/IMPLEMENTATION.md`;
- `mobile/DIAGNOSTIC.md`.

## Accepted v1 scope

Diagnostic v1 now includes:

- backend-authoritative availability based on valid published assessment content and at least two useful published entry levels;
- a complete learner flow: Intro -> Questions -> Result;
- reusable Activity rendering and answer validation shared with Lessons;
- deterministic ordered questions with configurable weights, target levels, thresholds and recommendation rules;
- exact weighted scoring before persistence rounding;
- historical versioned Diagnostic definitions and immutable completed attempts;
- non-resumable learner UX with explicit abandonment and fresh later starts;
- transport-level idempotency for start and submit;
- retakes as new attempts while preserving previous completed history;
- no immediate correctness feedback, no per-question retry/edit and no Skip in v1;
- no Diagnostic writes to Lesson/Course progression, Review, LearningDay, streak, Daily Goal or coins;
- recommendation of a level/course without automatically starting the course;
- current Courses progress/access truth projected into Result;
- Home integration using backend-authoritative `diagnosticAvailable`;
- DEV-only Diagnostic scenarios for realistic local acceptance testing;
- physical Android acceptance of the v1 Intro, activity flow, fixed Intro actions and A1/A2 Result behavior;
- regression verification that shared Lesson activity behavior remains intact.

## Visual acceptance boundary

The current Mobile implementation is accepted as **v1 quality**, not as the final commercial art-direction pass.

The v1 layout is coherent, functional and production-oriented enough to close the slice. The user has physically verified the main Android flow and accepted the current structure.

Do not reopen Diagnostic v1 merely to chase small visual differences from historical mockups.

## Deferred post-v1 debt

The following items are intentionally deferred and do **not** block closure:

- official/digital Alma character artwork and richer branded illustration direction;
- further polish of Diagnostic demo illustrations and iconography;
- broader visual-system refinement across spacing, hierarchy, typography and art direction in a future app-wide v2 pass;
- richer Result copy and optional qualitative sections such as strengths/reinforcement when backed by real pedagogical metadata;
- a permanent secondary retake entry such as Profile -> Tu nivel;
- deeper Home ASSESSED polish;
- broader release accessibility QA, including TalkBack, very large system fonts and very narrow/short devices;
- final production questions, exact count, weights, thresholds, estimated duration and wording approved by Alma;
- Lessons v2 debts discovered during comparison, including replay/review naming, lesson-position vs internal-progress presentation, context-illustration sizing and future Matching interaction improvements;
- Courses-specific visual debt such as cover/hero crop tuning.

## Reopen criteria

Reopen Diagnostic only when one of these becomes true:

1. Alma supplies/approves production assessment content that exposes a real contract or scoring problem;
2. a release-level accessibility or device issue blocks use;
3. a real product requirement changes placement semantics;
4. the app enters a coordinated v2 visual/art-direction pass;
5. a future Profile/level-history or retake surface requires a scoped integration.

Small cosmetic preferences alone are not a reason to reopen the v1 vertical.

## Final decision

Diagnostic v1 is **closed**. The next development work should proceed to another vertical or cross-cutting production capability rather than continuing iterative polish inside Diagnostic.
