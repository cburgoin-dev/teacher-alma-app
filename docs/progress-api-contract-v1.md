# Progress API Contract v1

This document is the HTTP/read-model source of truth for Progress v1. Product behavior is defined in `docs/progress-semantics-v1.md`; Courses/Roadmap, Review and Gamification remain the owners of their own domain semantics.

Progress is authenticated and read-oriented. It composes existing durable learner state for the Progress Dashboard and Activity Calendar. It must not become a second progression, Review, streak, timezone, inventory or entitlement engine.

## Endpoints

```text
GET /me/progress
GET /me/progress/calendar?month=YYYY-MM
```

Authentication is required for both.

`GET /me/progress` returns the main Progress Dashboard projection.

`GET /me/progress/calendar` returns one requested calendar month only. Unbounded history must not be embedded in the dashboard response.

## Shared day-state vocabulary

```ts
type ProgressHistoryState =
  | "LEARNED"
  | "PROTECTED"
  | "REPAIRED"
  | "BROKEN";

type ProgressWeekState = ProgressHistoryState | "NONE";
```

Meanings:

- `LEARNED`: at least one real qualifying durable learning event produced a `LearningDay` on that local date.
- `PROTECTED`: no real learning occurred on that date, but a persisted `StreakProtectionEvent` preserved continuity.
- `REPAIRED`: the date was a persisted streak break and its `StreakRepair.status` is `USED`.
- `BROKEN`: the date is a known persisted streak break and has not been successfully repaired.
- `NONE`: dashboard-week presentation only; no persisted semantic event for that date.

Protected and repaired dates are not learning days and must not increment learning-day counts.

Final-state precedence for one date is:

1. `LEARNED` when a `LearningDay` exists;
2. otherwise `REPAIRED` when the break was successfully repaired;
3. otherwise `PROTECTED` when a protection event covers the date;
4. otherwise `BROKEN` when a persisted unrepaired break exists;
5. otherwise `NONE`/omitted.

Do not return multiple semantic states for one date.

Presentation-only concepts such as today, future dates and out-of-month cells are not persisted Progress states. Responses include authoritative local `today` so Mobile can style those cells without independently choosing another timezone.

## `GET /me/progress`

### Response

`200 OK`

```ts
type ProgressDashboardResponse = {
  course: ProgressCourse | null;
  review: ProgressReviewSummary;
  consistency: ProgressWeek;
};

type ProgressCourse = {
  id: string;
  title: string;
  level: string | null;
  coverUrl: string | null;
  status: "PUBLISHED" | "COMING_SOON";
  progress: {
    status: "IN_PROGRESS" | "COMPLETED";
    completedRequiredNodes: number;
    totalRequiredNodes: number;
    percentage: number;
  };
  completedAt: string | null;
};

type ProgressReviewSummary = {
  pendingCount: number;
  groups: Array<{
    topic: {
      id: string;
      title: string;
    };
    pendingCount: number;
  }>;
};

type ProgressWeek = {
  timezone: string;
  today: string;      // YYYY-MM-DD in the authoritative learner timezone
  weekStart: string;  // Monday, YYYY-MM-DD
  weekEnd: string;    // Sunday, YYYY-MM-DD
  learningDaysThisWeek: number;
  days: Array<{
    date: string;     // exactly seven consecutive dates, Monday -> Sunday
    state: ProgressWeekState;
  }>;
};
```

The response intentionally does not include coin balance, Daily Goal, inventory or current/longest streak. Those remain authoritative under the existing shared Gamification resource.

If Mobile wants to show the current streak beside the weekly history, it must consume the same shared Gamification state already used by global metrics rather than create a Progress-owned streak value.

### Course selection

Progress must reuse Home/Courses learner-course semantics rather than invent a separate active-course field.

Selection order:

1. Prefer learner-visible `IN_PROGRESS` courses when any exist.
2. Among visible in-progress candidates, choose the same durable-learning recency rule used by Home:
   - completed normal Lesson durable progress;
   - passed/completed Unit Challenge progression;
   - future durable course-associated sources only after they are explicitly integrated into the shared selection semantics.
3. If durable completion timestamps tie or are absent, use `CourseProgress.startedAt` descending, then course id ascending.
4. If no visible in-progress course exists, prefer the most recently completed learner-visible course by non-null `CourseProgress.completedAt`; null legacy completion dates rank last, then `startedAt` descending, then course id ascending.
5. If there is no learner-visible in-progress/completed course, return `course = null`.

Hidden courses must not displace learner-visible candidates. Progress does not need to preserve a separate state enum when durable progress exists only on hidden content; the Dashboard simply degrades to `course = null` rather than exposing hidden editorial content.

`ProgressCourse.progress` uses exactly the same required-progression denominator and percentage as Courses/Roadmap/Home. Optional Lessons do not inflate or block required progression.

`completedAt` is non-null for normal completed records but remains nullable for legacy completed progress without a timestamp. It is `null` for `IN_PROGRESS`.

`Ver ruta` is a Mobile navigation concern and uses `course.id`; the endpoint does not return a second navigation token or duplicate Roadmap frontier.

### Review summary

Progress Review is a compact projection of the existing authoritative Review READY/EMPTY model.

Rules:

- `pendingCount` is the real count of currently eligible ACTIVE Review items.
- `groups` contains at most two Topic groups.
- Group counts are counts of eligible pending Review items in that Topic.
- Reuse Review's existing eligibility and deterministic group ordering; do not create a Progress-specific ranking algorithm.
- Do not return Review activities, source Lessons, batch tokens, answers or attempt payloads.
- When `pendingCount = 0`, return `groups = []`.

Example:

```json
{
  "pendingCount": 5,
  "groups": [
    {
      "topic": { "id": "topic-1", "title": "Familia y amigos" },
      "pendingCount": 3
    },
    {
      "topic": { "id": "topic-2", "title": "Rutinas y vida diaria" },
      "pendingCount": 2
    }
  ]
}
```

Rows are informational in Progress v1. The single learner action is the existing global Review flow (`Ver repaso`). Topic-specific Review navigation is outside this contract.

### Weekly consistency

`days` always contains exactly seven consecutive local dates ordered Monday through Sunday for the authoritative timezone returned in the same object.

Historical dates use the final semantic state defined above. Dates with no relevant persisted event use `NONE`.

`learningDaysThisWeek` counts only `LEARNED` states in that seven-day window. `PROTECTED`, `REPAIRED`, `BROKEN` and `NONE` do not increment it.

Future dates inside the current week remain `NONE`; Mobile distinguishes them from past neutral days by comparing each date with authoritative `today`.

Progress must not manufacture continuity events. It reads persisted LearningDay / protection / repair history and does not spend Protector inventory, apply a Repair or mutate streak state while serving this endpoint.

## `GET /me/progress/calendar?month=YYYY-MM`

### Query

`month` is required and must use strict calendar format:

```text
YYYY-MM
```

Examples:

- valid: `2026-10`
- invalid: `2026-1`, `10-2026`, arbitrary text

The requested month is interpreted in the learner's authoritative Gamification timezone.

Historical months and the current local month are valid. A month strictly after the learner's current local month is rejected; Mobile should not expose future-month navigation.

### Response

`200 OK`

```ts
type ProgressCalendarResponse = {
  month: string;       // canonical YYYY-MM requested month
  timezone: string;
  today: string;       // authoritative local YYYY-MM-DD
  learningDaysCount: number;
  days: Array<{
    date: string;      // YYYY-MM-DD, always inside `month`
    state: ProgressHistoryState;
  }>;
};
```

`days` is sparse: neutral/no-event dates are omitted. Mobile builds the calendar grid from the requested month and treats omitted historical dates as neutral.

`learningDaysCount` counts only `LEARNED` dates in the requested month.

Day entries are sorted by `date` ascending.

Examples:

```json
{
  "month": "2026-10",
  "timezone": "America/Mazatlan",
  "today": "2026-10-13",
  "learningDaysCount": 8,
  "days": [
    { "date": "2026-10-01", "state": "LEARNED" },
    { "date": "2026-10-02", "state": "LEARNED" },
    { "date": "2026-10-09", "state": "PROTECTED" },
    { "date": "2026-10-11", "state": "BROKEN" },
    { "date": "2026-10-12", "state": "REPAIRED" },
    { "date": "2026-10-13", "state": "LEARNED" }
  ]
}
```

The example illustrates shape only; dates/states must always come from real persisted learner history.

### Broken / repaired derivation

A `StreakRepair` row records a real identified break date even when the break is not currently repairable.

For Calendar:

- `status = USED` -> `REPAIRED` for `brokenDate`;
- any persisted unrepaired repair/break record for `brokenDate` -> `BROKEN`, unless higher precedence (`LEARNED`/`PROTECTED`) applies.

Do not expose internal repair statuses such as `ELIGIBLE` or `INVALIDATED` to Mobile. They are Gamification implementation details, not Calendar presentation states.

## Timezone rules

Both endpoints use `User.timezone`, the same IANA timezone authority used by Gamification.

Rules:

- historical `LearningDay.activityDate`, `StreakProtectionEvent.protectedDate` and `StreakRepair.brokenDate` are durable local-date facts and are not rewritten when timezone later changes;
- the current authoritative `today`, week boundaries and future-month validation use the learner's current stored timezone;
- Mobile must not reinterpret historical date-only values through device UTC conversion;
- Progress does not create a second timezone setting.

The app's existing timezone synchronization remains owned by Gamification/bootstrap. Progress endpoints read the currently persisted timezone and do not PATCH it.

## Gamification reconciliation boundary

Progress endpoints are read-only and must not call a write-oriented Gamification reconcile path merely to render history.

They reflect persisted continuity history at read time:

- persisted `LearningDay` rows;
- persisted `StreakProtectionEvent` rows;
- persisted `StreakRepair` rows.

The existing shared Gamification resource remains responsible for authoritative current streak/inventory and its normal reconciliation lifecycle. Progress must not consume Protector stock, create protection events, create/expire repair candidates or update `UserStreak` as a side effect of either GET.

## Read-only guarantees

Neither Progress endpoint may:

- create/update CourseProgress, LessonProgress or UnitChallengeProgress;
- create/resolve Review items or batches;
- create Gamification learning events or LearningDays;
- consume Protector inventory;
- create/update protection events or Repairs;
- award/spend coins;
- update UserStreak, Daily Goal or timezone;
- start a course;
- persist Progress UI/calendar state.

## Persistence / migration decision

No Progress-specific migration is expected for v1.

Existing durable state is sufficient in principle:

- CourseProgress plus LessonProgress / UnitChallengeProgress for course selection and progression;
- current Course/Roadmap progression helpers for required-node progress;
- ReviewItem + source Lesson/Topic relationships for Review summary;
- User.timezone;
- LearningDay.activityDate;
- StreakProtectionEvent.protectedDate;
- StreakRepair.brokenDate/status/repairedAt.

If implementation reveals a concrete correctness or query-cost blocker, document it before adding denormalized Progress state or indexes/migrations solely for presentation.

## Errors

### Shared

- `401 Unauthorized` when no authenticated user is available.
- `500 Internal Server Error` for unexpected persistence/domain failures.

### Calendar query

- `400 INVALID_PROGRESS_MONTH` when `month` is absent or not strict `YYYY-MM` / not a real calendar month.
- `400 PROGRESS_MONTH_IN_FUTURE` when the requested month is after the learner's current local month.

No course, no Review items, no learning history and an empty calendar month are normal valid states, not errors.

## Implementation boundary

Recommended backend shape:

```text
GET /me/progress
GET /me/progress/calendar
  -> ProgressController
  -> ProgressService
  -> ProgressRepository
  -> Prisma/PostgreSQL
```

The repository may use focused aggregate queries over existing tables. Do not call existing HTTP routes internally.

The service owns composition and date-state precedence. Reuse exported Courses/progression/visibility helpers and Review eligibility/group semantics where practical rather than copy-pasting business rules into a second implementation.

Progress does not own current streak, coins, Daily Goal, Shop inventory, Practice or achievement logic.

## Mobile contract notes

Progress Mobile should consume the shared Gamification resource independently for global header metrics and optional current-streak copy.

Dashboard weekly history may use a compact visual vocabulary while Activity Calendar uses a richer one. They must preserve the same meanings, but they do not need identical glyph size or treatment.

Approved visual direction:

- Dashboard: fast, compact weekly scan; learned days may use a restrained check/flame treatment.
- Calendar: learned days use a stronger streak/flame treatment and may be visually connected across consecutive continuity days.
- Protector and Repair should reuse the same recognizable product/icon language used by existing Gamification/Shop when feasible.
- A visually connected streak segment does not change day semantics: Protected/Repaired dates remain distinguishable and do not count as learned.

## Validation expectations

Backend Progress v1 should cover at least:

### Dashboard

- no course -> `course = null`;
- one in-progress visible course;
- multiple in-progress courses using Home-equivalent durable-activity recency;
- visible-course preference over hidden progress;
- fallback to most recently completed visible course;
- legacy completed course with null `completedAt`;
- required-progression percentage matches Courses/Roadmap;
- Review pending count 0 and >0;
- Review groups max 2 and preserve authoritative Review ordering/counts;
- Monday -> Sunday week generation;
- learned/protected/repaired/broken/NONE precedence;
- `learningDaysThisWeek` counts only learned dates;
- authoritative timezone/today returned.

### Calendar

- strict valid month;
- invalid month;
- future month rejection in learner timezone;
- empty historical month;
- learned day;
- protected day;
- repaired day;
- unrepaired broken day;
- final-state precedence when durable records overlap;
- sparse ascending response;
- learningDaysCount counts only learned dates;
- timezone boundary near UTC/local month transitions;
- timezone changes do not rewrite historical date facts.

### Safety

- endpoints produce no learner/progression/Review/Gamification mutations;
- PostgreSQL integration coverage is preferred for date selection, precedence and course-selection behavior.
