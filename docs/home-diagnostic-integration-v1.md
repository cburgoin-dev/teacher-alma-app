# Home ↔ Diagnostic integration v1

Status: **approved additive integration contract** for Diagnostic Backend v1.

This document is a narrow extension to `docs/home-semantics-v1.md` and `docs/home-api-contract-v1.md`. It does not reopen Home v1 architecture or visual design. It only defines the newly available Diagnostic domain truth that Home must consume once Diagnostic Backend v1 exists.

## 1. Existing Home precedence is unchanged

Home state remains derived in this order:

```text
ACTIVE > COURSE_COMPLETED > ASSESSED > NEW
```

Diagnostic completion or retake never displaces durable course progress with a Diagnostic-first state.

Examples:

- completed Diagnostic + no course progress -> `ASSESSED`;
- completed Diagnostic + course `IN_PROGRESS` -> `ACTIVE`;
- completed Diagnostic + no active course but completed course -> `COURSE_COMPLETED`;
- no completed Diagnostic and no course progress -> `NEW`.

## 2. NEW needs authoritative Diagnostic availability

The original Home v1 contract predates real Diagnostic implementation and therefore did not expose Diagnostic availability in the NEW read model.

Once Diagnostic Backend v1 exists, Home NEW must not always assume that `Hacer diagnóstico` is a valid action.

The backend must expose whether Diagnostic is currently learner-available under the canonical Diagnostic availability rules.

Conceptual additive shape:

```ts
type NewHomeHero = {
  type: "NEW";
  diagnosticAvailable: boolean;
  beginnerCourse: HomeCourse | null;
};
```

This is an additive field to the existing Home NEW projection.

## 3. Rendering consequence

```text
diagnosticAvailable = true
  -> Home may use the accepted "Descubre tu nivel" Diagnostic-first hero/action.

diagnosticAvailable = false
  -> Home must not expose a dead Diagnostic CTA and should use the real beginner/current-catalog path.
```

The exact visual composition remains a Mobile/Home concern. The backend supplies truth, not button labels or route names.

## 4. Availability ownership

Home must not reimplement Diagnostic validity.

`diagnosticAvailable` must come from the same backend/domain rule used by `GET /diagnostic`.

That shared rule includes, at minimum:

- exactly one current `PUBLISHED` Diagnostic for new starts;
- structurally valid definition/questions/scoring configuration;
- at least two useful reachable entry levels;
- every reachable recommendation level backed by a current learner-facing `PUBLISHED` Course.

Premium does not make a destination invalid. `COMING_SOON`, `DRAFT` or hidden/archived Courses do not count as available placement destinations.

Mobile must not derive this by comparing course cards, levels or local feature flags.

## 5. ASSESSED remains latest-completed-result driven

Home's `ASSESSED` state continues to consume the learner's latest COMPLETED Diagnostic attempt.

The compact projection remains conceptually:

```ts
{
  attemptId: string;
  completedAt: string | null;
  recommendedLevel: string | null;
}
```

plus a current recommended-Course projection when the historical `recommendedCourseId` is still learner-visible.

Current Course progress/access/visibility is owned by Courses. Home and Diagnostic must use the same course truth rather than invent separate status vocabularies.

If the historical recommended Course is no longer learner-visible, Home preserves the Diagnostic recommendation context but returns no broken Course action/projection.

## 6. Retakes do not change Home precedence

A new Diagnostic attempt may happen after the learner has started or completed courses.

- ACTIVE retake -> does not change Home state.
- ABANDONED retake -> does not change Home state or erase previous result.
- COMPLETED retake -> becomes the latest Diagnostic result, but course progress still wins Home precedence.

Therefore a learner with an `IN_PROGRESS` course remains Home `ACTIVE` even if a newer Diagnostic recommends another level/course.

## 7. Read-only boundary

`GET /me/home` remains read-only.

Reading Home must not:

- start/abandon Diagnostic attempts;
- repair invalid Diagnostic content;
- publish/archive a Diagnostic;
- start a Course;
- mutate Review/Gamification/progression.

It may call/reuse pure domain/read logic that derives Diagnostic availability and latest-result projection.

## 8. Backend implementation expectation

Diagnostic Backend v1 should make the minimum Home changes required to support this additive field and latest-result consistency.

Prefer:

- one shared Diagnostic availability/domain function;
- Home repository/service composition that consumes it;
- Home HTTP/type tests for `diagnosticAvailable=true/false`;
- regression tests preserving `ACTIVE > COURSE_COMPLETED > ASSESSED > NEW`.

Do not turn this integration into a Home visual redesign or a second Diagnostic implementation inside Home.
