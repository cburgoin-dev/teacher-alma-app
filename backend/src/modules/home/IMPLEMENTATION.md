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

Defensive editorial/data edges: durable progress on a subsequently hidden course
still determines Home state, but the hero course is null to avoid exposing hidden
content. A removed/fully completed frontier returns null topic/currentNode. Legacy
completed records without timestamps return null dates; non-null completion dates
rank first. These nullable editorial cases are not explicitly specified by the v1
examples and should be considered when integrating Mobile. Progress numbers always
remain Courses-derived even if authored content has changed since course completion.

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
