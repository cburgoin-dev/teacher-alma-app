# Courses v1

All four endpoints are mounted in `src/shared/app.ts` and composed with Prisma in `src/server.ts`:

```text
GET /courses
GET /courses/:courseId
GET /courses/:courseId/roadmap
POST /courses/:courseId/start

Route -> CourseController -> CourseService -> PrismaCourseRepository -> PostgreSQL
```

## Responsibilities and rules

- Routes map methods/paths. Controllers validate UUIDs, require `req.auth.userId`, call the service and return JSON. Express 5 forwards rejected handlers to the shared error middleware.
- Service and `course.rules.ts` own visibility, ordering, relevant lessons, derived progress, current lesson, prerequisites and commercial access.
- Repository reads minimal projections with user-scoped progress and entitlements. Its only write creates course progress with conflict skipping against the existing user/course unique constraint. Existing rows and timestamps are not updated.
- Only PUBLISHED and COMING_SOON courses are visible. COMING_SOON cannot start. Only PUBLISHED lessons participate, ordered by topic position then lesson position. Empty topics are omitted. Published optional lessons remain in the sequence.
- The first lesson is progression-unlocked. Subsequent pending lessons require completion of preceding published lessons. Completed lessons remain progression-unlocked; commercial access is evaluated separately. Correctness does not gate progression.
- Before course start there is no current lesson. Afterwards the first pending relevant lesson is current, even if commercially locked. Prerequisite locks take precedence over access locks in `lockReason`.
- Catalog/detail progress is null without a course-progress row. Percentage is the numeric ratio `completedLessons / totalLessons * 100`, without UI rounding; zero lessons yields zero. All relevant lessons completed yields derived COMPLETED/100% and null `nextLesson`, without updating persisted completion in this slice.
- Free lessons require no entitlement. Paid access uses ACTIVE grants where `startsAt <= now` and `expiresAt` is null or strictly later than now. Course-specific grants are checked before global grants, following the logical schema. Nonempty entirely free courses report FREE; empty courses do not gain FREE access vacuously.
- Start validates visibility, COMING_SOON, nonempty published content and access to the first relevant lesson, including repeated requests. It creates only course progress, once. Reads never write.

## Temporary authentication

`src/shared/auth.ts` is replaceable and development-only. Set the following in the launching terminal without editing `.env`:

```powershell
$env:NODE_ENV = 'development'
$env:DEV_AUTH_USER_ID = '<UUID of an existing application user>'
npm run dev
```

Every request in this explicitly configured development instance uses that known local user. The UUID is server configuration, never taken from headers/body/query, and must already exist in PostgreSQL. The adapter is disabled unless NODE_ENV is exactly development. Without a trusted context the endpoints return 401. Production needs real middleware setting `req.auth.userId`; no provider/SDK is selected here.

Prisma-backed requests require a valid database connection, the existing applied schema and course data. This slice neither seeds data nor runs migrations.

## Verification

With existing project tools:

```sh
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
npm run build
node --test dist/modules/courses/course.rules.test.js dist/modules/courses/course.repository.test.js dist/modules/courses/course.service.test.js dist/modules/courses/course.http.test.js
```

Tests cover service rules, repository query isolation/conflict behavior and real HTTP responses. Persistence is simulated; concurrent-start tests are not live PostgreSQL concurrency tests.

In the agent environment the existing dist directory denied writes and tsx failed while obtaining OS user information. Compilation was verified into a temporary directory and tests ran there using Node's built-in runner, resolving Express/CORS from the installed backend dependencies. No privileges, OS configuration, dependencies, secrets, schema or migrations were changed.

No contract-definition blocker remains. Real authentication and live PostgreSQL integration verification are separate pending integration work.
