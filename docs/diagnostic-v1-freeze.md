# Diagnostic v1 freeze

Status: **APPROVED / FROZEN for Backend v1 implementation**.

This document records the final review decisions that close Diagnostic v1 product/API design before backend implementation. It complements and refines:

- `docs/diagnostic-semantics-v1.md` — canonical product/behavior semantics;
- `docs/diagnostic-api-contract-v1.md` — canonical learner-facing HTTP contract.

If an older provisional document conflicts with this freeze note, use this note plus the two canonical Diagnostic documents above. Final production questions, exact thresholds, weights, estimated duration and pedagogical wording remain configurable content and are not frozen as production values.

## 1. Frozen product direction

Diagnostic v1 is a short optional placement flow that recommends a useful starting point inside Teacher Alma's current catalog. It is not a CEFR certification test.

Frozen behavior:

- no learner-facing Resume;
- explicit confirmed exit abandons the ACTIVE attempt;
- a genuine later start creates a fresh attempt and replaces/abandons stale ACTIVE state;
- network retries remain idempotent and do not create academic retries;
- retakes are supported with no v1 cooldown;
- each retake creates a new historical attempt;
- the most recent COMPLETED attempt is the current Diagnostic result;
- an ACTIVE/ABANDONED retake does not displace the prior COMPLETED result;
- complete configured question set, deterministic `position` order;
- no random subset and no adaptive/IRT selection;
- no per-question correctness feedback;
- no per-question retry/edit after accepted submission;
- no Skip / `No sé` behavior in v1;
- no Diagnostic Gamification, Review debt, LearningDay or learning-progression mutation;
- Diagnostic never starts a course;
- recommendation routes into the existing Course Detail/Courses/Roadmap ownership model;
- Activity rendering/answer validation must reuse the existing shared Activity engine/primitives rather than creating a Diagnostic-specific exercise system.

## 2. Availability and catalog invariants

Diagnostic availability is backend-authoritative.

A learner-facing Diagnostic is available only when the current definition is valid and can make a genuinely useful placement choice.

At minimum:

- exactly one Diagnostic definition is current `PUBLISHED` for new starts;
- the definition, question set and scoring configuration are structurally valid;
- it has evaluable questions;
- it can produce at least two distinct useful entry levels;
- **every `recommendedLevel` reachable by the published rules resolves, at publication/availability time, to a learner-facing `PUBLISHED` Course**.

Premium access does not invalidate an academic destination. `COMING_SOON`, `DRAFT` or hidden/archived Courses do not satisfy the availability invariant.

If only one useful level/course is available, Diagnostic should not be exposed in Home, Profile or another learner-facing entry surface.

## 3. Versioning and in-flight attempts

Diagnostic definitions use the conceptual lifecycle:

```text
DRAFT -> PUBLISHED -> ARCHIVED
```

At most one definition is `PUBLISHED` for **new starts**.

Published academic content is immutable. A material change to questions, order, answer semantics, weights, target-level metadata or recommendation rules requires a new Diagnostic version.

### Version switch while an attempt is ACTIVE

A publication change affects new starts only.

If a learner began Diagnostic v1 and v2 becomes current before that learner finishes, the existing ACTIVE attempt remains bound to v1 and may complete normally against v1 even after v1 becomes `ARCHIVED`.

Do not reject an otherwise valid in-flight attempt merely because its bound Diagnostic version is no longer the current version for new starts.

This rule depends on published-version immutability: the archived version and referenced assessment content must retain their historical academic meaning.

## 4. Scoring precision

Scoring remains deterministic weighted scoring:

```text
overallScore = correctWeight / totalWeight * 100
levelScore(level) = correctWeightForLevel / totalWeightForLevel * 100
```

Recommendation thresholds must be evaluated using exact/decimal arithmetic, not binary floating-point approximations.

Frozen precision rule:

1. calculate weighted scores with exact decimal arithmetic;
2. compare recommendation thresholds against the **unrounded** calculated values;
3. select the first matching configured recommendation rule/fallback;
4. only then round/persist the learner attempt's `internalScore` to the schema's storage precision (currently three decimal places).

Do not round a score before threshold evaluation. For example, an exact value below `70` must not satisfy a `70` threshold merely because presentation/storage rounding would display `70.000`.

The implementation may use Prisma Decimal/another exact decimal mechanism, but the behavior above is canonical.

## 5. Recommended Course: historical vs current truth

A completed attempt freezes the historical academic result:

- `recommendedLevel`;
- `recommendedCourseId` when one was resolved at completion;
- completion/result snapshot fields.

Current learner rendering may change as the Course domain changes.

`GET /diagnostic/result` should hydrate the persisted historical recommended Course using current Courses visibility/progress/access truth:

- still learner-visible -> return current Course projection;
- currently `IN_PROGRESS` -> reflect current progress and use normal Courses navigation semantics;
- `COMPLETED` -> reflect completion and do not offer a fake start action;
- no longer learner-visible -> preserve `recommendedLevel`, return `recommendedCourse: null`, and avoid a broken course action.

Diagnostic must not invent a parallel `diagnosticCourseState`, percentage or entitlement model.

### Historical FK policy

The existing Prisma relation currently uses `DiagnosticAttempt.recommendedCourse -> Course` with `onDelete: SetNull`. Backend v1 should change this historical relationship to a restrictive deletion policy (`Restrict` or equivalent database protection).

A Course referenced by completed Diagnostic history should not be physically deleted merely to remove it from the current catalog. Use Course status/visibility to retire it.

This preserves the historical `recommendedCourseId` while still allowing the learner-facing projection to become null when the Course is no longer visible.

## 6. Home integration

Home state precedence remains:

```text
ACTIVE > COURSE_COMPLETED > ASSESSED > NEW
```

Retaking/completing Diagnostic does not displace real course progress with a Diagnostic-first Home state.

Home NEW must nevertheless know whether Diagnostic is actually available. Mobile must not infer availability by combining local Courses data with Diagnostic rules.

Backend v1 should extend the Home NEW read model with an authoritative Diagnostic availability projection, conceptually:

```ts
type NewHomeHero = {
  type: "NEW";
  diagnosticAvailable: boolean;
  beginnerCourse: HomeCourse | null;
};
```

Behavior:

- `diagnosticAvailable = true` -> Home may render the `Descubre tu nivel` hero/action;
- `diagnosticAvailable = false` -> Home uses the real beginner/current catalog path and exposes no dead Diagnostic CTA.

The availability rule should be implemented once in shared Diagnostic/domain logic and reused by Diagnostic and Home. Do not duplicate the publication/catalog validation algorithm in `HomeService`.

The existing `GET /me/home` remains read-only.

## 7. HTTP contract freeze

The learner-facing v1 endpoint shape remains:

```text
GET  /diagnostic
POST /diagnostic/attempts
POST /diagnostic/attempts/:attemptId/questions/:questionId/submit
POST /diagnostic/attempts/:attemptId/abandon
GET  /diagnostic/result
```

There is intentionally no learner-facing Resume/current-ACTIVE endpoint and no public attempt-history endpoint in v1.

The final question submission is the completion boundary. There is no separate `POST /complete` requirement.

Start and submission requests use stable request-key idempotency. Submission should follow the established Unit Challenge pattern where appropriate: deterministic validated payload hash, immutable accepted submission and stored/reconstructible response receipt for exact transport retries.

A request key is a transport-idempotency key, not a Resume token.

## 8. Attempt/concurrency boundary

Attempt lifecycle remains:

```text
ACTIVE -> COMPLETED
ACTIVE -> ABANDONED
```

Backend v1 must explicitly test races such as:

- a new start replacing an older ACTIVE attempt while a delayed submit from the old attempt arrives;
- submit racing with explicit abandon;
- duplicate final submit due to network retry;
- two concurrent final submissions.

Use transactions, ownership checks, row locks and/or database uniqueness so only one valid academic transition wins.

A delayed mutation against an attempt that has already become ABANDONED/COMPLETED must not resurrect or alter it.

## 9. Activity ownership/refactor direction

The current reusable Activity public/answer engine lives under Lessons (`backend/src/modules/lessons/lesson.activity.ts`) even though the domain concept is shared.

Diagnostic Backend v1 should reuse it, preferably by moving/extracting the generic logic to shared Activity ownership such as `backend/src/modules/activities/` and updating Lessons to consume the shared implementation.

Do not copy/paste a second answer evaluator into `diagnostics`.

The refactor must preserve existing Lesson behavior/tests while making the same public allowlist and validation semantics available to Diagnostic.

## 10. Persistence expected for Backend v1

The current core entities remain the correct foundation:

```text
Diagnostic
DiagnosticQuestion
DiagnosticAttempt
DiagnosticAnswer
```

Expected focused evolution includes:

- Diagnostic scoring/recommendation configuration (`JSONB` or equivalent versioned data-driven storage);
- optional `estimatedMinutes` editorial metadata;
- start `requestKey` idempotency;
- `abandonedAt` for attempts;
- answer submission request key/hash/response receipt or equivalent robust retry mechanism;
- database/application invariant preventing multiple current ACTIVE attempts for one user;
- database/application invariant supporting at most one current PUBLISHED Diagnostic for new starts;
- historical recommended-Course FK changed from `SetNull` to restrictive deletion behavior.

A separate `diagnostic_results` table is not required for v1; completed `DiagnosticAttempt` remains the result snapshot.

## 11. Existing-document reconciliation

Until the broader docs are physically rewritten, the following older wording is explicitly superseded:

- `docs/data-model.md` older `diagnostic_answers.activity_id` description. Current/canonical relation is `DiagnosticAnswer -> DiagnosticQuestion -> Activity`, matching Prisma and `docs/database-schema.md`.
- older screen notes that treat Diagnostic Intro/Question/Result as undefined or treat historical mockup actions such as `Saltar`/`Compra única` as required behavior.
- Home NEW wording that assumes a Diagnostic CTA without checking real backend availability.

Mockups remain visual references. During the first Diagnostic Mobile task, copy the approved historical references into `docs/mockups/diagnostic/` and document primary/secondary precedence there.

## 12. Backend readiness

With this freeze note plus the two canonical Diagnostic documents, no further product/competitive research is required before Backend v1 unless implementation exposes a real contradiction or blocker.

The next implementation slice should cover:

- focused Prisma migration/constraints;
- shared Activity extraction/refactor;
- Diagnostic repository/service/controller/routes;
- availability validation;
- scoring and recommendation engine;
- idempotent/concurrent-safe start/submit/abandon;
- current Course projection for result;
- demo/seed configuration with clearly non-production thresholds/content;
- Home `diagnosticAvailable` integration;
- unit/integration/PostgreSQL tests.

Mobile Diagnostic implementation comes after Backend v1 acceptance.
