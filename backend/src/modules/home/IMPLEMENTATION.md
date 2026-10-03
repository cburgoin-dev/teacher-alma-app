# Home Backend v1

`GET /me/home` is authenticated and executes its read model in a PostgreSQL
`REPEATABLE READ`, `READ ONLY` transaction. No migration or persisted Home state.

- State uses durable CourseProgress statuses before the latest completed Diagnostic.
- Activity selection includes LessonProgress, completed LessonRun (including later
  completions), and UnitChallengeProgress timestamps. Equal activity uses startedAt,
  then course id for a stable final tie. Browsing timestamps are ignored.
- Courses owns visibility, required progress, access and Roadmap currentNode.
- Review owns eligibility; Home selects only the fields required by that predicate.
- Beginner means a published A1 course in catalog order; absent explicit beginner
  metadata, other levels are not inferred to be beginner courses.
- Recommendations preserve COMING_SOON and paid access. Featured courses cap at two.

Defensive editorial/data edges: prefer visible candidates within each progress status,
using the same recency and tie rules. Hidden progress still determines Home state
when no visible candidate exists, but the hero course is null to avoid exposing hidden
content. Next-course recommendations use the chosen visible completed course; without
that context the recommendation is null. A removed/fully completed frontier returns null topic/currentNode. Legacy
completed records without timestamps return null dates; non-null completion dates
rank first. These nullable cases are documented in the API contract; Mobile must
render a safe degraded state without inventing content. Progress numbers always
remain Courses-derived even if authored content has changed since course completion.

MVP debt: historical LessonProgress/LessonRun/UnitChallengeProgress reads remain
unchanged. Query aggregation/optimization is deferred until a separate performance iteration.

Validation from backend:

```powershell
& node_modules/.bin/tsc.cmd --noEmit -p tsconfig.json
node --import tsx --test src/modules/home/*.test.ts src/modules/courses/*.test.ts
$env:RUN_HOME_DB_TESTS='1'
node --import tsx --test src/modules/home/home.integration.test.ts
```

The opt-in PostgreSQL test requires local teacher_alma_dev on port 5433. It creates
UUID-isolated fixtures, snapshots all user-owned rows around reads and cleans up
only those fixtures. It never resets demo data.
