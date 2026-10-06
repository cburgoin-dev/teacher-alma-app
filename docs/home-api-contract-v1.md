# Home API Contract v1

This document is the HTTP/read-model source of truth for Home v1. Product behavior is defined in `docs/home-semantics-v1.md`; Courses/Roadmap, Review, Gamification and future Diagnostic remain the owners of their own domain semantics.

Home is an authenticated, read-only orchestration surface. It composes existing durable domain facts into a compact response for Mobile. It must not mutate course progress, Review, Diagnostic, Gamification, entitlements or purchases.

## Endpoint

```text
GET /me/home
```

Authentication is required.

## Response overview

`200 OK`

```ts
type HomeState = "NEW" | "ASSESSED" | "ACTIVE" | "COURSE_COMPLETED";

type HomeResponse = {
  state: HomeState;
  learner: {
    displayName: string | null;
  };
  hero:
    | NewHomeHero
    | AssessedHomeHero
    | ActiveHomeHero
    | CourseCompletedHomeHero;
  review: {
    pendingCount: number;
  };
  featuredCourses: HomeCourse[];
};
```

Gamification is intentionally absent from this contract. Coins, streak, Daily Goal, inventory and related state remain authoritative under `GET /me/gamification` and the shared Mobile Gamification resource.

Notifications and avatar management are also outside this contract. Mobile may use a non-functional visual avatar placeholder until a real profile/avatar source exists.

## Shared projections

### `HomeCourse`

```ts
type HomeCourse = {
  id: string;
  title: string;
  description: string | null;
  level: string | null;
  coverUrl: string | null;
  status: "PUBLISHED" | "COMING_SOON";
  progress: null | {
    status: "IN_PROGRESS" | "COMPLETED";
    completedRequiredNodes: number;
    totalRequiredNodes: number;
    percentage: number;
  };
  access: {
    hasFullAccess: boolean;
    hasFreeContent: boolean;
    source: "FREE" | "SUBSCRIPTION" | "COURSE_PURCHASE" | "NONE";
  };
};
```

This projection reuses Courses semantics. Home must not invent different progress percentages, access sources or visibility rules. `description` is the existing editorial Course description, nullable; Mobile uses it without a second Courses request and must not fabricate missing descriptions. This field belongs to HomeCourse (featured/beginner/recommended), not the smaller ACTIVE/completed identity.

### `HomeCurrentNode`

```ts
type HomeCurrentNode = {
  type: "LESSON" | "UNIT_CHALLENGE";
  id: string;
  title: string;
  access: {
    hasAccess: boolean;
    lockReason: null | "ACCESS";
  };
};
```

The node is the same curricular frontier represented by Roadmap `currentNode`. Home does not compute an independent next-step algorithm.

`lockReason` is `ACCESS` only when the canonical progression node is academically current/unlocked but commercially unavailable. Prerequisite-locked nodes cannot be the canonical `currentNode`.

## Derived Home state

State precedence is:

1. at least one `CourseProgress.status = IN_PROGRESS` -> `ACTIVE`;
2. otherwise at least one `CourseProgress.status = COMPLETED` -> `COURSE_COMPLETED`;
3. otherwise at least one completed Diagnostic attempt -> `ASSESSED`;
4. otherwise -> `NEW`.

Do not persist a separate `home_state` value.

## Active-course selection

Prefer learner-visible `IN_PROGRESS` courses when any exist. A hidden course must not displace a visible candidate even when its durable activity is newer. If only hidden in-progress courses remain, preserve `ACTIVE` from durable state and return the defensive nullable hero described below.

Among the eligible candidates, choose the course with the most recent durable learning completion across that course:

- completed normal Lesson (`LessonProgress.completedAt` / completed `LessonRun`);
- passed/completed Unit Challenge progression (`UnitChallengeProgress.completedAt`);
- future durable course-associated learning sources only after they are explicitly integrated into Home semantics.

If completion signals tie or are absent, choose the most recent `CourseProgress.startedAt`, then course id ascending for a deterministic final tie.

Opening Course Detail, Roadmap or catalog browsing does not affect active-course selection.

Do not add `users.last_active_course_id` for Home v1 unless implementation proves existing durable timestamps insufficient.

## Recently completed course

For `COURSE_COMPLETED`, prefer learner-visible completed courses and select the one with the greatest non-null `CourseProgress.completedAt`. Hidden courses cannot displace a visible candidate. Null legacy dates rank last; ties use `startedAt` descending, then course id ascending. If only hidden completed courses remain, preserve `COURSE_COMPLETED` with `completedCourse = null` and `recommendedCourse = null`.

Completing a course does not auto-start, auto-activate or grant access to another course.

## `NEW` response

Conditions:

- no in-progress course;
- no completed course;
- no completed Diagnostic attempt.

Example:

```json
{
  "state": "NEW",
  "learner": {
    "displayName": "Sofía"
  },
  "hero": {
    "type": "NEW",
    "beginnerCourse": {
      "id": "course-a1",
      "title": "Inglés A1",
      "level": "A1",
      "coverUrl": "/demo-media/a1.png",
      "description": "Bases para comunicarte en situaciones reales.",
      "status": "PUBLISHED",
      "progress": null,
      "access": {
        "hasFullAccess": false,
        "hasFreeContent": true,
        "source": "NONE"
      }
    }
  },
  "review": {
    "pendingCount": 0
  },
  "featuredCourses": []
}
```

`beginnerCourse` may be `null` when the visible catalog does not contain a valid beginner/start course. Do not fabricate A1 solely for Home.

Home v1 does not need a Diagnostic id merely to render the `Hacer diagnóstico` visual direction; the future Diagnostic vertical owns how the current available diagnostic is resolved.

## `ASSESSED` response

Conditions:

- no in-progress course;
- no completed course;
- latest relevant Diagnostic attempt is completed.

Example:

```json
{
  "state": "ASSESSED",
  "learner": {
    "displayName": "Sofía"
  },
  "hero": {
    "type": "ASSESSED",
    "diagnostic": {
      "attemptId": "diagnostic-attempt-id",
      "completedAt": "2026-10-03T17:20:00.000Z",
      "recommendedLevel": "A2"
    },
    "recommendedCourse": {
      "id": "course-a2",
      "title": "Inglés A2",
      "level": "A2",
      "coverUrl": "/demo-media/a2.png",
      "description": null,
      "status": "PUBLISHED",
      "progress": null,
      "access": {
        "hasFullAccess": false,
        "hasFreeContent": true,
        "source": "NONE"
      }
    }
  },
  "review": {
    "pendingCount": 0
  },
  "featuredCourses": []
}
```

`diagnostic.recommendedLevel` may be `null`.

`recommendedCourse` may be `null` when the completed Diagnostic has no recommended course, the referenced course is no longer learner-visible, or the current catalog has no matching learner-facing course. Home must remain renderable in that case.

The recommendation is pedagogical guidance only. Starting any valid course moves Home to `ACTIVE`.

If the recommended course exists but requires paid access, preserve that recommendation and return its real access state. Do not substitute a lower/free course merely because it is easier to enter.

## `ACTIVE` response

Conditions:

- at least one course is `IN_PROGRESS`.

Example with Lesson frontier:

```json
{
  "state": "ACTIVE",
  "learner": {
    "displayName": "Sofía"
  },
  "hero": {
    "type": "ACTIVE",
    "course": {
      "id": "course-a1",
      "title": "Inglés A1",
      "level": "A1",
      "coverUrl": "/demo-media/a1.png",
      "progress": {
        "status": "IN_PROGRESS",
        "completedRequiredNodes": 5,
        "totalRequiredNodes": 14,
        "percentage": 36
      }
    },
    "topic": {
      "id": "topic-id",
      "title": "Presentaciones"
    },
    "currentNode": {
      "type": "LESSON",
      "id": "lesson-id",
      "title": "Nice to meet you!",
      "access": {
        "hasAccess": true,
        "lockReason": null
      }
    }
  },
  "review": {
    "pendingCount": 6
  },
  "featuredCourses": []
}
```

For a Unit Challenge frontier, `currentNode.type = UNIT_CHALLENGE` and the remaining shape is unchanged.

The course progress percentage uses the same required-progression denominator as Courses/Roadmap: required published Lessons plus valid required Unit Challenge milestones.

The backend must resolve the current Topic and node title so Mobile does not need to fetch/scan a full Roadmap solely to render Home.

If the canonical current node is commercially unavailable, keep it as the current node and return:

```json
{
  "hasAccess": false,
  "lockReason": "ACCESS"
}
```

Do not choose another academic node to avoid the access restriction.

### Defensive nullable context

`hero.course`, `hero.topic` and `hero.currentNode` may be `null` only for legacy inconsistencies or editorial changes: for example, durable progress whose course is no longer learner-visible, or a missing required frontier. Prefer a valid learner-visible in-progress candidate before returning a null course. If no such candidate exists, all three fields are null while `state` remains `ACTIVE`. A visible course with no frontier keeps its course projection and returns null topic/currentNode. Commercial access restrictions alone never cause these nulls.

Mobile must render a safe degraded state without inventing course, Topic or node content or offering navigation to missing content.

## `COURSE_COMPLETED` response

Conditions:

- no course is `IN_PROGRESS`;
- at least one course is `COMPLETED`.

Example:

```json
{
  "state": "COURSE_COMPLETED",
  "learner": {
    "displayName": "Sofía"
  },
  "hero": {
    "type": "COURSE_COMPLETED",
    "completedCourse": {
      "id": "course-a1",
      "title": "Inglés A1",
      "level": "A1",
      "coverUrl": "/demo-media/a1.png",
      "completedAt": "2026-10-02T23:10:00.000Z",
      "progress": {
        "status": "COMPLETED",
        "completedRequiredNodes": 14,
        "totalRequiredNodes": 14,
        "percentage": 100
      }
    },
    "recommendedCourse": {
      "id": "course-a2",
      "title": "Inglés A2",
      "level": "A2",
      "coverUrl": "/demo-media/a2.png",
      "description": null,
      "status": "COMING_SOON",
      "progress": null,
      "access": {
        "hasFullAccess": false,
        "hasFreeContent": false,
        "source": "NONE"
      }
    }
  },
  "review": {
    "pendingCount": 3
  },
  "featuredCourses": []
}
```

`recommendedCourse` may be `null`.

The next-course recommendation is the next learner-visible course by configured catalog `position` after the visible completed course selected for the hero, including after a visibility fallback. If that next course is `COMING_SOON`, preserve it as the recommendation instead of skipping pedagogically to a later published course.

`hero.completedCourse` may be `null` for the equivalent legacy/editorial case where durable completed progress has no learner-visible course context. Prefer a valid visible completed candidate before returning null. Without visible completed context, `recommendedCourse` is also null; do not derive a recommendation from hidden content. Mobile must render a safe degraded completion state without inventing content.

`completedCourse.completedAt` and `diagnostic.completedAt` are ISO timestamp strings or `null` for legacy completed records without a timestamp. A missing timestamp does not erase durable completion state.

The recommendation never starts the course automatically.

## Review summary

Home only needs:

```json
{
  "pendingCount": 6
}
```

Count learner-owned active/pending Review items according to existing Review semantics.

Do not return Review groups, activities, batch tokens or answer data from Home.

If `pendingCount > 0`, Mobile may show the real `Repaso` card and navigate to Review.

If `pendingCount = 0`, Mobile may show the approved non-interactive Practice visual placeholder. Practice does not appear in this API contract until its own vertical slice exists.

## Featured courses

Return at most two learner-visible course projections.

Selection is deterministic:

- `ASSESSED`: include the recommended course first when it is learner-visible, then fill remaining slots from catalog order without duplicates;
- `COURSE_COMPLETED`: include the recommended next course first when learner-visible, then fill remaining slots from catalog order without duplicates;
- `NEW` and `ACTIVE`: fill from learner-visible catalog order by `position`;
- never return the same course twice;
- preserve real `PUBLISHED` / `COMING_SOON`, progress and access truth.

Home does not implement AI ranking, engagement ranking or personalized recommendation beyond the explicit Diagnostic/next-course rules above.

## Read-only guarantees

`GET /me/home` must not:

- create or update `CourseProgress`;
- create Lesson/Unit Challenge runs;
- create or resolve Review items;
- create or modify Diagnostic attempts;
- award coins or update streak/Daily Goal;
- create purchases or entitlements;
- auto-start a recommended course;
- persist Home UI state.

## Persistence / migration decision

Home v1 should first be implemented with the current schema. No Home-specific migration is expected.

Existing durable fields already support the required derivation, including:

- `User.displayName`;
- `CourseProgress.status`, `startedAt`, `completedAt`;
- `LessonProgress.completedAt` / completed Lesson runs;
- `UnitChallengeProgress.completedAt`;
- `DiagnosticAttempt.status`, `recommendedLevel`, `recommendedCourseId`, `completedAt`;
- `ReviewItem.status`.

If implementation reveals a real correctness or query-cost problem, document that evidence before adding denormalized Home state.

## Errors

Expected failures are intentionally small for this read-only endpoint:

- `401 Unauthorized` when no authenticated user is available;
- `500 Internal Server Error` for unexpected persistence/domain failures.

A normal lack of courses, recommendation, Review items or Diagnostic data is not an error; return a valid state/payload with nullable/empty projections.

## Implementation boundary

Recommended backend shape follows repository architecture:

```text
GET /me/home
  -> HomeController
  -> HomeService
  -> HomeRepository
  -> Prisma/PostgreSQL
```

The repository may use focused aggregate queries rather than call HTTP endpoints internally. The service owns Home-state precedence, active-course selection, next-course selection and response composition.

Reuse existing domain/access/progression helpers where possible instead of duplicating Courses logic. Home is a read model, not a second progression engine.

## Validation expectations

Backend Home v1 should include tests for at least:

- NEW derivation;
- ASSESSED derivation with recommendation and null recommendation;
- ACTIVE with one course;
- ACTIVE with multiple in-progress courses and durable-activity recency;
- active-course fallback to most recently started when no durable completions exist;
- ACTIVE Lesson frontier;
- ACTIVE Unit Challenge frontier;
- ACTIVE access-locked current node;
- COURSE_COMPLETED using most recently completed course;
- next-course recommendation including `COMING_SOON` preservation;
- no next course -> `recommendedCourse = null`;
- Review pending count 0 and >0;
- featured-course deduplication/order/max 2;
- read endpoint produces no learning/Gamification/access mutations.

PostgreSQL integration coverage is preferred for the selection/derivation rules because they depend on real persisted timestamps and relationships.
