# Progress v1 semantics

Status: product semantics approved for design/API work.

Progress is the learner-facing place to understand advancement, unfinished reinforcement work and study consistency. It is a read-oriented composition over existing Courses/Roadmap, Review and Gamification data. It must not become a second progression, streak or mastery engine.

## 1. Scope

Progress v1 contains two learner-facing surfaces:

1. **Progress Dashboard** — the main `Progreso` tab.
2. **Activity Calendar** — a secondary screen reached from the consistency card.

The v1 dashboard focuses on information that is already supported by real durable data:

- current/recent course progress;
- pending Review work;
- weekly study consistency;
- access to the monthly activity calendar.

The following are explicitly deferred:

- Strengths/mastery classification;
- Achievements/badges;
- XP/ranking/social comparison;
- a full Practice engine;
- detailed skill analytics;
- arbitrary motivational statistics that cannot be derived reliably.

The existing Progress mockup is a visual reference only. Its `Tus fortalezas` and `Tus logros` cards are not v1 requirements.

## 2. Dashboard hierarchy

Preferred hierarchy:

1. Shared/global header actions and Progress title.
2. Course progress card.
3. Review / reinforcement card.
4. Consistency card with the current week.
5. Optional future Practice entry point only when Practice exists as a real feature.
6. Bottom navigation.

The page is scrollable. The first viewport should prioritize course progress and reinforcement rather than decorative statistics.

## 3. Course progress card

The course card answers: **How far have I advanced and where can I continue?**

### Course selection

Use the same learner-course semantics already established for Home/Courses rather than inventing a Progress-specific active-course field.

Preferred context:

1. active/in-progress course when one exists;
2. otherwise the most recently completed learner-visible course;
3. otherwise no course card / an appropriate empty state.

If multiple courses are in progress, selection must follow the same durable-learning recency rule as Home.

### Data shown

The card may show:

- course title and level;
- required-progression percentage;
- completed required nodes vs total required nodes when useful;
- compact topic/lesson counts only when they are real and not misleading;
- a short non-invented encouragement/status line;
- `Ver ruta` action.

Progress percentage must reuse Courses/Roadmap required-progression semantics. Optional lessons must not inflate/block required progression.

### Navigation

`Ver ruta` opens the selected course Roadmap. For an in-progress course, Roadmap should position around the canonical current node. For a completed course, use the existing completed-roadmap positioning behavior.

## 4. Review / reinforcement

Review remains the authoritative source for pending error-driven reinforcement.

The dashboard may group pending Review items by their source Topic for presentation, but it must not create a second Review state model.

### Presentation

When pending Review exists:

- title such as `Para reforzar`;
- total pending count;
- at most two compact Topic groups, ordered deterministically by meaningful Review recency/priority;
- each group may show Topic title and pending item count;
- one dominant `Ver repaso` action routes to the existing Review flow.

The dashboard does not need Review batch/session tokens or detailed activity payloads merely to render this card.

When there is no pending Review, show a positive/quiet empty state rather than fabricating work.

## 5. Practice

Practice and Review are separate concepts:

- **Review** is generated from real mistakes/pending Review items.
- **Practice** is a future learner-initiated practice experience independent from pending mistakes.

Progress is the preferred permanent/home-base location for Practice once it exists, while Home may keep a shortcut card.

Progress v1 must not implement a fake Practice backend or fabricate practice statistics. A visual placeholder is optional during design exploration, but production v1 should not expose a dead primary action.

## 6. Consistency / weekly habit card

`Tu constancia` summarizes recent study behavior without redefining streak rules.

### Week model

- week runs Monday through Sunday;
- display seven day slots (`L M X J V S D` in Spanish UI);
- real learning days are counted separately from protected/repaired continuity days;
- current streak remains owned by Gamification.

Suggested copy:

- `N días de aprendizaje esta semana` for the real-learning count;
- optionally show current streak from the shared Gamification resource, clearly labeled as streak rather than learning-day count.

Tapping the calendar affordance opens Activity Calendar.

## 7. Activity Calendar

Activity Calendar is a real secondary Progress screen, not merely an expanded weekly card.

Its purpose is to show the learner's habit history and explain how continuity was maintained or broken.

### Navigation

- initial month: current month in the learner's authoritative Gamification timezone;
- previous/next month navigation;
- future months should not be navigable beyond the current month unless later product needs justify it;
- returning preserves the normal Progress navigation stack.

### Week layout

Use Monday through Sunday consistently with the dashboard weekly card.

### Calendar day semantics

The calendar distinguishes study from continuity mechanics.

Historical semantic states:

- `LEARNED` — at least one real qualifying durable learning event occurred on that local date.
- `PROTECTED` — no real learning occurred, but a Streak Protector preserved continuity for that date.
- `REPAIRED` — a previously broken/missed date was later successfully repaired.
- `BROKEN` — a missed date caused a break and remains unrepaired.
- neutral/no-event — historical date with no relevant learning/continuity event and no need for special emphasis.

Presentation-only states such as `TODAY`, `FUTURE` and out-of-month cells are derived by Mobile from the requested month/current local date and are not separate persisted business states.

### Final-state precedence for a date

A date should render one primary final semantic state:

1. `LEARNED` when a real LearningDay exists;
2. otherwise `REPAIRED` when the relevant break was successfully repaired;
3. otherwise `PROTECTED` when a protection event covers the date;
4. otherwise `BROKEN` when it is a known unrepaired break;
5. otherwise neutral.

Do not display a repaired day simultaneously as a red/broken day. The calendar may use a repair-specific visual that communicates recovery, but the final state is `REPAIRED`.

Protected and repaired dates are **not** counted as learning days.

### Visual direction

The LingoDeer screenshots are inspiration for clarity and habit storytelling, not a design to copy literally.

Useful direction:

- month title with compact previous/next controls;
- strong but restrained day-state icons;
- learned day: positive study/flame/check treatment;
- protected day: shield treatment;
- repaired day: repair/restore treatment;
- broken day: clear X/break treatment;
- today: subtle distinct outline/accent;
- future: subdued/disabled;
- include a small legend only if icon meaning is not sufficiently self-evident.

Avoid turning the calendar into a gamification inventory/shop screen. Protector/Repair purchase/use controls remain in Gamification/Shop flows.

## 8. Timezone and authority

Calendar dates must use the same IANA timezone authority already used by Gamification.

Progress must not reinterpret server timestamps in device-local time independently or create a second timezone preference.

Existing relevant durable sources include:

- `LearningDay.activityDate`;
- `StreakProtectionEvent.protectedDate`;
- `StreakRepair.brokenDate`, status and `repairedAt`;
- `UserStreak` for streak aggregate state.

The calendar is a read model over these sources. It does not mutate streak history.

## 9. Read-model/API direction

Preferred separation:

- `GET /me/progress` for the main dashboard;
- `GET /me/progress/calendar?month=YYYY-MM` for one requested calendar month.

Do not send unbounded calendar history with the dashboard.

### Dashboard conceptual projection

The dashboard read model should contain only what the screen needs, conceptually:

```ts
type ProgressDashboard = {
  course: ProgressCourse | null;
  review: {
    pendingCount: number;
    groups: Array<{
      topicId: string | null;
      topicTitle: string;
      pendingCount: number;
    }>;
  };
  consistency: {
    learningDaysThisWeek: number;
    week: Array<{
      date: string;
      state: "LEARNED" | "PROTECTED" | "REPAIRED" | "BROKEN" | "NONE";
    }>;
  };
};
```

Exact HTTP payload is frozen in the API-contract step, not by this illustrative shape.

### Calendar conceptual projection

```ts
type ProgressCalendarMonth = {
  month: string; // YYYY-MM
  timezone: string;
  learningDaysCount: number;
  days: Array<{
    date: string; // YYYY-MM-DD
    state: "LEARNED" | "PROTECTED" | "REPAIRED" | "BROKEN";
  }>;
};
```

Dates omitted from `days` are neutral/no-event dates for that month.

Gamification remains authoritative for coin balance, Daily Goal, inventory and current/longest streak. If Progress needs current streak for presentation, Mobile should consume the same shared Gamification resource rather than fork it into Progress-owned state.

## 10. Persistence

Progress-specific persistent state is not expected for v1.

Prefer aggregate/read queries over existing durable learning data. Do not add fields such as `progress_dashboard_state`, `weekly_consistency` or duplicated streak history merely for presentation.

A schema change is justified only if implementation proves a correctness or meaningful query-cost problem that cannot reasonably be solved from current durable sources.

## 11. Loading and refresh

Progress is a read-heavy screen and should eventually use polished loading presentation rather than a permanent plain `Cargando progreso...` message.

Skeleton cards/structural placeholders are the preferred future visual direction for dashboard-style reads. This is a transversal loading-system concern and does not require Progress v1 to invent a one-off skeleton framework if the shared system does not exist yet.

Keep last-known data during ordinary refresh when practical; do not blank the entire dashboard merely because a background refresh started.

## 12. Mockup requirements before Mobile implementation

Create/approve two primary visual references:

1. `progress-dashboard-primary` — based on the existing Progress mockup, adapted to approved v1 scope. Remove Strengths/Achievements from the v1 target and give more visual importance to course progress, Review and consistency.
2. `progress-calendar-primary` — a new monthly Activity Calendar mockup inspired by the supplied LingoDeer screenshots while following Teacher Alma's light/blue/red visual language.

Mockups are visual targets, not business-rule contracts.

## 13. Deferred / follow-up work

- real Practice vertical and permanent Progress entry point;
- Strengths/mastery model;
- Achievements/badges and broader Gamification v2;
- XP/ranking/social systems;
- richer longitudinal statistics;
- official Alma avatar/character integration;
- shared skeleton/loading system;
- calendar day detail/drill-down if later justified;
- sharing streak/calendar visuals if later requested.
