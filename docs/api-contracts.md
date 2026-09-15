# API Contracts

This document records the REST contracts that are sufficiently defined for implementation. Contracts should be organized around user-facing use cases/vertical slices rather than exposing database tables directly.

Business rules belong in the service layer. Controllers should remain thin: interpret/validate the HTTP request, delegate to the service, and map the result to an HTTP response.

## General conventions

- API style: REST over HTTP.
- Authenticated user-facing endpoints require authentication.
- Identifiers use UUIDs.
- Derived UI/domain state should not be persisted only to satisfy a screen if it can be safely computed from the underlying domain data.
- Commercial access and learning progress are separate concerns.
- A successful read does not create progress or mutate learning state.
- Error responses use a stable machine-readable `code` plus a human-readable `message`.
- Until the real authentication provider is selected, controllers/services should depend only on an application-level authenticated `userId`, not on a specific JWT/provider implementation. A replaceable development-only auth middleware may inject `req.auth.userId`; provider-specific authentication must remain outside Courses business logic.

Error shape:

```json
{
  "error": {
    "code": "COURSE_NOT_FOUND",
    "message": "Course not found"
  }
}
```

Common HTTP meanings:

- `400 Bad Request`: invalid request shape or invalid parameter format.
- `401 Unauthorized`: user is not authenticated.
- `403 Forbidden`: authenticated user lacks the required access for the requested operation.
- `404 Not Found`: resource does not exist or must not be visible to the current user.
- `409 Conflict`: resource exists, but its current state prevents the requested operation.
- `500 Internal Server Error`: unexpected server failure.

---

# Courses vertical slice

The Courses slice supports course discovery, course detail, roadmap rendering and explicitly starting a course.

Current contracts:

```text
GET  /courses
GET  /courses/:courseId
GET  /courses/:courseId/roadmap
POST /courses/:courseId/start
```

Course visibility rules used by this slice:

- `PUBLISHED`: visible and potentially startable.
- `COMING_SOON`: visible, but cannot be started.
- `DRAFT`: hidden from normal users and treated as non-existent from the public/user-facing API.

For Courses v1, a **relevant lesson** means `lessons.status = 'PUBLISHED'`.

Relevant lessons are ordered globally by:

```text
topic.position ASC
then lesson.position ASC
```

Clarifications for Courses v1:

- `DRAFT` and `ARCHIVED` lessons are excluded from roadmap, progress totals, prerequisites and next-lesson selection.
- All `PUBLISHED` lessons count toward `totalLessons` and appear in the active roadmap, regardless of `is_required`.
- Sequential progression for this slice follows all `PUBLISHED` lessons in the ordered path. `is_required` does not cause a displayed published lesson to be silently skipped.
- `completedLessons` counts relevant lessons whose `lesson_progress.status = 'COMPLETED'` for the authenticated user.
- `is_required` may later participate in course-completion or optional-content rules, but it does not change the Courses v1 roadmap sequence.

Commercial access does not come from `course_progress`. Starting a course never creates a purchase or entitlement.

## 1. GET /courses

### Purpose

Return the course catalog required by the Courses screen, including user-specific learning progress and access state.

### Authentication

Required.

### Request

No request body.

No pagination or filters are required for the initial MVP because the catalog is expected to be small. These can be added later without changing the core domain model.

### Success response

`200 OK`

```json
{
  "courses": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Inglés A1",
      "slug": "ingles-a1",
      "level": "A1",
      "description": "Bases para comunicarte en situaciones cotidianas.",
      "coverUrl": "https://example.com/a1.jpg",
      "status": "PUBLISHED",
      "position": 1,
      "progress": {
        "status": "IN_PROGRESS",
        "completedLessons": 3,
        "totalLessons": 10,
        "percentage": 30
      },
      "access": {
        "hasFullAccess": false,
        "hasFreeContent": true,
        "source": "NONE"
      }
    }
  ]
}
```

`progress` may be `null` when the user has never started the course.

Supported access sources for this contract:

```text
FREE
SUBSCRIPTION
COURSE_PURCHASE
NONE
```

`FREE` means the entire relevant course content is currently available without a paid entitlement. `SUBSCRIPTION` and `COURSE_PURCHASE` are derived from valid entitlements. `NONE` means the user does not have full commercial access, although free lessons may still exist.

### Business rules

- Return visible courses only.
- `DRAFT` courses must not be returned.
- `PUBLISHED` and, when useful to the catalog, `COMING_SOON` courses may be returned.
- Sort by configured `position`.
- Progress is specific to the authenticated user.
- Access is specific to the authenticated user.
- `percentage` is derived from completed relevant lessons and total relevant lessons; it is not a separately persisted UI value.
- This endpoint is read-only and must not create `course_progress`.

### Relevant failures

- `401` if unauthenticated.
- `500` for unexpected failures.

---

## 2. GET /courses/:courseId

### Purpose

Return the information required by the Course Detail screen.

### Authentication

Required.

### Path parameters

- `courseId`: UUID.

### Success response

`200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Inglés A1",
  "slug": "ingles-a1",
  "level": "A1",
  "description": "Bases para comunicarte en situaciones cotidianas.",
  "coverUrl": "https://example.com/a1.jpg",
  "status": "PUBLISHED",
  "content": {
    "topicCount": 4,
    "lessonCount": 10,
    "freeLessonCount": 3
  },
  "progress": {
    "status": "IN_PROGRESS",
    "completedLessons": 3,
    "totalLessons": 10,
    "percentage": 30
  },
  "access": {
    "hasFullAccess": false,
    "hasFreeContent": true,
    "source": "NONE"
  }
}
```

`progress` may be `null` if the user has never started the course.

`content.lessonCount` and `content.freeLessonCount` count only relevant (`PUBLISHED`) lessons. `content.topicCount` counts topics that contain at least one relevant lesson for the active learner-facing course structure.

### Business rules

- A `DRAFT` course must behave as non-existent for a normal user.
- A `COMING_SOON` course may be returned so the UI can show its detail, but it cannot be started.
- Access and progress are derived independently.
- The backend returns domain state, not UI instructions. It must not return values such as `buttonLabel`, `redirectTo` or a preselected visual CTA.
- This endpoint is read-only and must not create `course_progress` or `lesson_progress`.

### Relevant failures

`400 Bad Request` for an invalid UUID.

```json
{
  "error": {
    "code": "INVALID_COURSE_ID",
    "message": "Invalid course id"
  }
}
```

`404 Not Found` when the course does not exist or is `DRAFT`.

```json
{
  "error": {
    "code": "COURSE_NOT_FOUND",
    "message": "Course not found"
  }
}
```

Also possible: `401`, `500`.

---

## 3. GET /courses/:courseId/roadmap

### Purpose

Return the ordered course structure and enough user-specific state for the mobile app to render the learning roadmap.

The backend describes domain state. It does not define visual node coordinates, serpentine layout or other presentation details.

### Authentication

Required.

### Path parameters

- `courseId`: UUID.

### Success response

`200 OK`

```json
{
  "course": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Inglés A1",
    "level": "A1"
  },
  "progress": {
    "completedLessons": 3,
    "totalLessons": 10,
    "percentage": 30
  },
  "topics": [
    {
      "id": "8b3ec122-af3d-4c33-b8ba-21f8c20cd111",
      "title": "Presentaciones",
      "position": 1,
      "lessons": [
        {
          "id": "c572f9d2-5e02-4f19-af37-394d3acb4c01",
          "title": "Saludos básicos",
          "position": 1,
          "progressStatus": "COMPLETED",
          "access": {
            "type": "FREE",
            "hasAccess": true
          },
          "progression": {
            "unlocked": true,
            "isCurrent": false,
            "lockReason": null
          }
        },
        {
          "id": "52b25e31-93f6-45de-a88d-bdb76ccb8e83",
          "title": "Presentarte",
          "position": 2,
          "progressStatus": "IN_PROGRESS",
          "access": {
            "type": "FREE",
            "hasAccess": true
          },
          "progression": {
            "unlocked": true,
            "isCurrent": true,
            "lockReason": null
          }
        },
        {
          "id": "d0fe4045-5c40-4922-a0d6-5e56aeb2710e",
          "title": "Preguntas básicas",
          "position": 3,
          "progressStatus": "NOT_STARTED",
          "access": {
            "type": "PAID",
            "hasAccess": false
          },
          "progression": {
            "unlocked": false,
            "isCurrent": false,
            "lockReason": "PREREQUISITE"
          }
        }
      ]
    }
  ]
}
```

Supported `progressStatus` values:

```text
NOT_STARTED
IN_PROGRESS
COMPLETED
```

Supported roadmap `access.type` values:

```text
FREE
PAID
```

Supported `lockReason` values:

```text
PREREQUISITE
ACCESS
null
```

### Separation of concerns

These values must remain independent:

```text
progressStatus != access != progression
```

Examples:

- A lesson can be `NOT_STARTED`, `PAID`, and still have `hasAccess = true` because the user has a valid subscription or permanent course entitlement.
- A lesson can be `NOT_STARTED`, `FREE`, but remain locked because its prerequisite has not been completed.

### Progression rules

Initial MVP progression is sequential within the ordered course path of relevant (`PUBLISHED`) lessons:

- The first relevant lesson is initially progression-unlocked.
- Completing lesson `N` unlocks the next relevant lesson in global `topic.position`, then `lesson.position`, order.
- A completed lesson remains accessible for repetition.
- Correctness and completion are separate concepts.
- Wrong answers do not by themselves prevent progression.
- Lesson completion follows the lesson completion rules defined elsewhere; this endpoint only reports the resulting state.
- `is_required = false` does not remove a published lesson from the Courses v1 sequence.

A lesson may be progression-unlocked but still commercially inaccessible. In that case `unlocked` may be `true` while `access.hasAccess` is `false`; `lockReason = "ACCESS"` represents that effective block for entering the lesson.

### Current lesson

`isCurrent` identifies the lesson the user should currently continue/start according to learning progression.

Before a course has been explicitly started, the first lesson may be progression-unlocked while `isCurrent` remains `false`.

After the course is started, the next relevant pending lesson becomes `isCurrent = true`.

If all relevant lessons are completed, no lesson is current.

### Business rules

- Return only relevant (`PUBLISHED`) lessons.
- Topics containing no relevant lessons are omitted from the learner-facing roadmap.
- Topics and lessons are returned in configured order.
- `DRAFT` courses are treated as non-existent.
- `COMING_SOON` courses may expose their public structure only if product/design later requires it; they must never become startable through this endpoint. For the initial implementation, the service may return the same visible structure rules used by Course Detail without creating progress.
- Reading the roadmap never starts a course or lesson.
- The endpoint must not create `course_progress`, `lesson_progress`, attempts, entitlements, coin transactions or streak activity.

### Relevant failures

- `400` invalid UUID.
- `401` unauthenticated.
- `404` course not found / hidden draft.
- `500` unexpected failure.

---

## 4. POST /courses/:courseId/start

### Purpose

Explicitly record that the authenticated user decided to begin a course.

Starting a course is a learning-state operation. It is not a purchase, entitlement grant, lesson start, activity attempt or streak action.

### Authentication

Required.

### Path parameters

- `courseId`: UUID.

### Request body

None.

### Success response

`200 OK`

```json
{
  "course": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Inglés A1",
    "level": "A1"
  },
  "progress": {
    "status": "IN_PROGRESS",
    "completedLessons": 0,
    "totalLessons": 10,
    "percentage": 0
  },
  "nextLesson": {
    "id": "c572f9d2-5e02-4f19-af37-394d3acb4c01",
    "title": "Saludos básicos"
  }
}
```

If the course was already started, the same endpoint returns the current existing progress and the current next relevant lesson. It does not create duplicates.

When every relevant lesson is completed, `nextLesson` is `null` and the derived progress response is:

```json
{
  "status": "COMPLETED",
  "completedLessons": 10,
  "totalLessons": 10,
  "percentage": 100
}
```

### Idempotency

The operation is intentionally idempotent at the domain level:

```text
POST /courses/:id/start
POST /courses/:id/start
```

must not create two course-progress records or otherwise duplicate side effects.

The database uniqueness rule for user + course is a persistence safeguard; the service must also treat repeated calls as a valid request for the current started state.

A successful first call and a repeated successful call both return `200 OK`. The client does not need to distinguish whether the underlying `course_progress` row was created during that exact request.

### Core state transition

```text
Authenticated user
  -> request course start
  -> validate course state/content/access
  -> if course_progress exists: return existing state
  -> otherwise create course_progress
  -> return current progress + next lesson
```

Starting a course creates `course_progress` only.

It does **not** create `lesson_progress`. A lesson becomes started only through the future lesson-start use case.

### Empty published course

A `PUBLISHED` course with zero relevant (`PUBLISHED`) lessons cannot be started. This is treated as a content/state conflict rather than as a missing course.

Return `409 Conflict`:

```json
{
  "error": {
    "code": "COURSE_HAS_NO_CONTENT",
    "message": "Course has no available content"
  }
}
```

The start operation must not create `course_progress` in this case.

### Commercial access rule

Starting a course never creates or modifies `purchase` or `entitlement` records.

The service may allow a user without full commercial access to start a course when the first relevant lesson is accessible free content.

Conceptually:

```text
First relevant lesson is FREE
  -> start allowed

First relevant lesson is PAID
  -> valid course purchase? -> allowed
  -> valid Premium subscription? -> allowed
  -> otherwise -> denied
```

If the user has no access to the first relevant lesson with which to begin the course, return `403 Forbidden`:

```json
{
  "error": {
    "code": "COURSE_ACCESS_REQUIRED",
    "message": "Access to this course is required"
  }
}
```

This rule preserves the freemium model while keeping learning progress independent from commercial entitlements.

### Course status rules

#### PUBLISHED

May be started when the content and access rules above are satisfied.

#### COMING_SOON

Cannot be started.

Return `409 Conflict`:

```json
{
  "error": {
    "code": "COURSE_NOT_AVAILABLE",
    "message": "Course is not available yet"
  }
}
```

#### DRAFT

Treated as non-existent for a normal user.

Return `404 Not Found`:

```json
{
  "error": {
    "code": "COURSE_NOT_FOUND",
    "message": "Course not found"
  }
}
```

### Validation order

Conceptually, the service/controller flow should enforce:

```text
1. Validate courseId format.
2. Require authenticated user.
3. Resolve visible course.
4. Reject COMING_SOON for start.
5. Resolve relevant lessons and reject an empty published course.
6. Determine whether the user can access the first relevant lesson.
7. Reuse existing course_progress or create it once.
8. Derive current progress and next lesson.
9. Return response.
```

HTTP/basic request validation belongs at the boundary. Business decisions such as whether the user can start a course belong in the service layer.

### Allowed side effects

Allowed:

```text
CREATE course_progress (only if it does not already exist)
```

Not allowed:

```text
CREATE lesson_progress
CREATE activity_attempt
CREATE entitlement
CREATE purchase
CREATE learning_day
CREATE coin_transaction
UPDATE streak
```

Starting/opening a course is not considered a completed learning action and must not maintain a streak or award coins.

### Transactional behavior

The start operation is small, but the write must still preserve consistency under retries/concurrent requests. The unique user-course constraint plus service-level idempotency are required.

When future operations require multiple dependent writes that must succeed or fail as a unit—especially payments, entitlement creation or other financially relevant actions—they should be executed as database transactions with appropriate ACID guarantees and provider-level idempotency where applicable.

### Relevant failures

- `400 INVALID_COURSE_ID`
- `401` unauthenticated
- `403 COURSE_ACCESS_REQUIRED`
- `404 COURSE_NOT_FOUND`
- `409 COURSE_NOT_AVAILABLE`
- `409 COURSE_HAS_NO_CONTENT`
- `500` unexpected failure

---

## Authentication boundary for Courses v1

Authentication provider selection is intentionally outside this slice.

For implementation now:

```text
request
  -> replaceable auth middleware
      -> req.auth.userId
          -> controller
              -> CourseService(userId, ...)
```

Rules:

- Courses services receive an application user id; they do not parse tokens.
- No provider-specific auth SDK may be introduced by Courses v1.
- A temporary development-only middleware/context may inject a known user id so the HTTP slice can be exercised before real authentication exists.
- The temporary mechanism must be isolated and replaceable, and must not contain Courses business rules.
- Unauthenticated requests still map to `401` at the HTTP boundary.

## Service-layer responsibility

The Courses controller should not decide progression, visibility or commercial-access rules. The intended responsibility flow is:

```text
Route
  -> Controller
      -> CourseService
          -> CourseRepository / related repositories
              -> PostgreSQL
```

Examples of service-level decisions:

- Is this course visible to a normal user?
- Can this course currently be started?
- Does the user have access to the first relevant content?
- What is the user's course progress?
- Which lesson is current/next?
- Is a lesson blocked by prerequisite progression or by access?

The controller should mainly validate/interpret HTTP input, call the service and map application results/errors to HTTP responses.

## Implementation boundary for Courses v1

The first implementation should cover only these four contracts and the minimal supporting repository/service logic required by them.

Do not invent additional public endpoints, payment behavior, lesson-start behavior, activity behavior or admin behavior as part of this slice.

The next likely contracts after Courses v1 are lesson start/content and activity attempts, but they should be defined separately before implementation.