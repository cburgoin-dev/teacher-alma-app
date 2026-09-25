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
- All `PUBLISHED` lessons appear in the active roadmap and content counts, regardless of `is_required`.
- Course progress `totalLessons`, `completedLessons`, percentage and completion use only `PUBLISHED` lessons with `is_required = true`. Completed counts additionally require the authenticated user's `lesson_progress.status = 'COMPLETED'`.
- Main progression/current/next selection follows required published lessons in the ordered path. Optional published lessons remain visible and can be accessed/completed, but never block the next required lesson or course completion.
- `content.lessonCount` remains the total published content count, not the required-progress denominator.

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
- `percentage` is derived from completed required published lessons and total required published lessons; it is not a separately persisted UI value.
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

Initial MVP progression is sequential within the ordered course path of required `PUBLISHED` lessons:

- A lesson is progression-unlocked when all preceding required published lessons are completed.
- Completing a required lesson unlocks the next required lesson in global `topic.position`, then `lesson.position`, order; intervening optional lessons do not block it.
- A completed lesson remains accessible for repetition.
- Correctness and completion are separate concepts.
- Wrong answers do not by themselves prevent progression.
- Lesson completion follows the lesson completion rules defined elsewhere; this endpoint only reports the resulting state.
- `is_required = false` does not remove a published lesson from the roadmap; it only excludes it from required progress and prerequisites for later lessons.

A lesson may be progression-unlocked but still commercially inaccessible. In that case `unlocked` may be `true` while `access.hasAccess` is `false`; `lockReason = "ACCESS"` represents that effective block for entering the lesson.

### Current lesson

`isCurrent` identifies the lesson the user should currently continue/start according to learning progression.

Before a course has been explicitly started, the first lesson may be progression-unlocked while `isCurrent` remains `false`.

After the course is started, the next required published pending lesson becomes `isCurrent = true`.

If all required published lessons are completed, no lesson is current.

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

When every required published lesson is completed, `nextLesson` is `null` and the derived progress response is:

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

The service may allow a user without full commercial access to start a course when its first required published lesson (or first published lesson if none is required) is accessible free content.

Conceptually:

```text
First relevant lesson is FREE
  -> start allowed

First relevant lesson is PAID
  -> valid course purchase? -> allowed
  -> valid Premium subscription? -> allowed
  -> otherwise -> denied
```

If the user has no access to that initial lesson with which to begin the course, return `403 Forbidden`:

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
6. Determine whether the user can access the first required published lesson (falling back to the first published lesson when none is required).
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

The next likely contracts after Courses v1 are lesson start/content and activity attempts; those contracts are defined below for Lessons v1.

---

# Lessons v1 contracts

Lessons v1 covers the focused learning loop from a roadmap lesson node through content, practice, summary and persisted lesson completion. It intentionally does not implement the full Review, Gamification, Payments or Admin vertical slices.

## Lessons v1 scope and invariants

Typical MVP lesson shape:

```text
CONTENT_STEP
  -> ACTIVITY_STEP
  -> optional ACTIVITY_STEP
  -> SUMMARY_STEP
  -> complete
  -> Result
```

This is a common shape, not a fixed required count. Lessons are intended to remain concise, generally around 5–15 minutes.

Stable rules:

- Reading lesson content has no side effects.
- Starting a lesson never silently starts its parent course.
- The parent course must already be started/completed for the learner before a normal lesson can be started.
- Learning progression and commercial access are both validated by the backend.
- Completion and correctness are separate.
- Incorrect practice answers do not block lesson completion.
- Score uses the first submitted attempt for each relevant activity.
- Retries are stored but do not rewrite the first-attempt lesson score.
- Incorrect attempts consolidate Review only when their run completes; immediate correct retries do not erase errors.
- Exact coin rewards, streak changes and purchase flows remain outside Lessons v1.

## Step derivation

The database persists ordered `lesson_blocks`; the API exposes presentation-oriented steps.

Derivation for Lessons v1:

1. Consecutive explanatory blocks `TEXT`, `VIDEO`, `IMAGE` and `EXAMPLE` are grouped into one `CONTENT_STEP`.
2. Each `ACTIVITY` block becomes one `ACTIVITY_STEP`.
3. Each `SUMMARY` block becomes one `SUMMARY_STEP`.
4. Order is preserved.
5. A step identifier must be deterministic for the current lesson structure. The implementation may use the first/source block UUID as the public `step.id`; clients must treat it as opaque.

No `lesson_steps` persistence table is required for v1.

## Public block payloads

The following shapes define the minimum renderer-facing payloads. Optional fields may be omitted when unused.

### TEXT

```json
{
  "type": "TEXT",
  "title": "El verbo to be",
  "body": "..."
}
```

### IMAGE

```json
{
  "type": "IMAGE",
  "url": "https://...",
  "alt": "Descripción de la imagen",
  "caption": "..."
}
```

### VIDEO

```json
{
  "type": "VIDEO",
  "url": "https://...",
  "title": "Explicación",
  "posterUrl": "https://...",
  "caption": "..."
}
```

Lessons v1 does not require 100% playback or exact video-position persistence.

### EXAMPLE

```json
{
  "type": "EXAMPLE",
  "title": "Ejemplo",
  "primaryText": "I am a student.",
  "secondaryText": "Soy estudiante.",
  "note": "..."
}
```

### SUMMARY

```json
{
  "type": "SUMMARY",
  "title": "Resumen de la lección",
  "points": [
    "Punto principal",
    "Frase útil"
  ]
}
```

## Activity public configuration

The backend may persist answer keys/accepted answers inside `activities.config`, but the lesson read contract must never expose private validation keys directly to the client.

### MULTIPLE_CHOICE

Public example:

```json
{
  "id": "activity-uuid",
  "type": "MULTIPLE_CHOICE",
  "prompt": "¿Qué responderías?",
  "options": [
    { "id": "a", "text": "I'm fine, thanks." },
    { "id": "b", "text": "Goodbye." }
  ]
}
```

Private configuration may additionally contain the correct option id.

### FILL_BLANK_OPTIONS

Public example:

```json
{
  "id": "activity-uuid",
  "type": "FILL_BLANK_OPTIONS",
  "prompt": "_____! Nice to meet you.",
  "options": [
    { "id": "a", "text": "Hello" },
    { "id": "b", "text": "Goodbye" }
  ],
  "hint": "..."
}
```

### FILL_BLANK_TEXT

Public example:

```json
{
  "id": "activity-uuid",
  "type": "FILL_BLANK_TEXT",
  "prompt": "I _____ a student.",
  "hint": "...",
  "caseSensitive": false
}
```

Accepted answers remain server-side.

### MATCH_WORD_IMAGE

Public example:

```json
{
  "id": "activity-uuid",
  "type": "MATCH_WORD_IMAGE",
  "prompt": "Relaciona cada palabra con su imagen",
  "interactionMode": "TAP",
  "words": [
    { "id": "w1", "text": "Hello" }
  ],
  "images": [
    { "id": "i1", "url": "https://...", "alt": "Saludo" }
  ]
}
```

Supported presentation hints are `TAP` and `DRAG`. Both submit the same logical pair mapping. The backend validates pairs and is intentionally unaware of the gesture used.

---

## 5. GET /lessons/:lessonId

### Purpose

Return the authenticated learner-facing lesson structure and current persisted progress without starting or mutating the lesson.

### Authentication

Required.

### Success response

`200 OK`

```json
{
  "lesson": {
    "id": "lesson-uuid",
    "title": "Nice to meet you!",
    "description": "Presentaciones básicas",
    "accessType": "FREE",
    "topic": {
      "id": "topic-uuid",
      "title": "Saludos y presentaciones"
    },
    "course": {
      "id": "course-uuid",
      "title": "Inglés A1",
      "level": "A1"
    },
    "position": {
      "lesson": 2,
      "totalLessons": 8
    }
  },
  "state": {
    "status": "NOT_STARTED",
    "canStart": true,
    "lockReason": null,
    "currentStepId": null
  },
  "steps": [
    {
      "id": "step-opaque-id",
      "type": "CONTENT_STEP",
      "required": true,
      "blocks": []
    }
  ]
}
```

GET returns NOT_STARTED or COMPLETED and currentStepId is always null. ACTIVE runs are not exposed as Resume. GET activityProgress is durable history; normal UI uses counters from run mutations.

For a completed lesson, Mobile starts a fresh local Replay from the first step. It ignores historical `currentStepId` and `activityProgress` for this session. GET itself does not clear completion or create a persisted scored run.

### Read-only behavior

This endpoint must not create or update:

- `course_progress`
- `lesson_progress`
- `lesson_block_progress`
- `activity_attempts`
- `review_items`
- entitlements
- gamification records

### Relevant failures

- `400 INVALID_LESSON_ID`
- `401` unauthenticated
- `403 LESSON_ACCESS_REQUIRED` when commercial access is the blocking reason
- `404 LESSON_NOT_FOUND` for hidden/unpublished/non-existent content
- `409 LESSON_PREREQUISITE_REQUIRED` when progression does not permit entry
- `500` unexpected failure

---

## 6. POST /lessons/:lessonId/runs

Authenticated; validates published content, started course, prerequisite and access. Completed lesson returns 409 LESSON_ALREADY_COMPLETED (use Replay).

Body: `{ "requestKey": "unique-entry-request-key" }`. Required 16–100 ASCII letters/digits/underscore/hyphen. Mobile generates a new key per mounted entry and reuses it only for retries of that entry request. Invalid/missing key: 400 INVALID_RUN_REQUEST_KEY.

Under user lock, a new key abandons previous ACTIVE runs and creates a fresh run at 0% when pedagogical requirements remain. Same key returns the same ACTIVE run; reusing an abandoned key returns 409 LESSON_RUN_NOT_ACTIVE. Unique request key and partial ACTIVE index prevent duplicate live runs. This transport retry rule is not Resume.

200 response:
`{ runId, lessonId, status: "ACTIVE" | "COMPLETED", completion, firstStepId, currentStepId, progress: { completedSteps, totalSteps, percentage }, activityProgress: { completed, total } }`.

Both counters belong to this run; a new run starts with zero completed steps/activities. Starting normally writes no durable lesson/block progress or Review; a nonempty lesson with no pedagogical requirements consolidates immediately.

## 7. POST /lessons/:lessonId/runs/:runId/steps/:stepId/complete

Empty body. Authenticated owner, matching lesson, ACTIVE run, publication/access/prerequisite and step order required. Non-activity steps only (otherwise 409 ACTIVITY_REQUIRES_ATTEMPT). Stores block traversal against the run and derives the next required pointer. Repeating a completed content step is idempotent within the ACTIVE run.

200: `{ status, completion, runId, lessonId, completedStepId, currentStepId, progress: { completedSteps, totalSteps, percentage }, activityProgress: { completed, total } }`.

Optional blocks do not block required progression. Historical durable blocks do not satisfy this run's traversal.

## 8. POST /lessons/:lessonId/runs/:runId/steps/:stepId/attempt

Same ownership/lifecycle/access/order checks; activity step required (409 STEP_IS_NOT_ACTIVITY).

Body by activity type:

- Multiple choice / fill options: `{ selectedOptionId }`.
- Fill text: `{ text }`.
- Matching: `{ pairs: [{ wordId, imageId }] }`.

Malformed answers: 400 INVALID_ANSWER, no writes. Valid submissions atomically append an attempt and mark the run's activity block complete. Numbering starts at 1 for each run/activity; concurrent submissions serialize. Retries are new submissions, not score replacements. Mobile gates double submit.

200:
`{ status, completion, runId, attempt: { id, attemptNumber, isCorrect, countsForLessonScore }, feedback: { message, correctAnswer, explanation? }, reinforcement: { onCompletion }, progress: { completedSteps, totalSteps, percentage, currentStepId }, activityProgress: { completed, total } }`.

`reinforcement.onCompletion` means this activity has an incorrect submission in this run. It is prospective, not proof of a saved Review item. Non-final ACTIVE attempts never create/increment durable Review. The final pedagogical attempt consolidates completion and Review atomically. Private answer configuration remains excluded from GET; evaluated answer feedback is returned only after submission.

## 9. POST /lessons/:lessonId/runs/:runId/complete

Idempotent confirmation/result endpoint; completion already occurs automatically on the final pedagogical mutation. Empty body. Requires ownership, access and all required pedagogical run blocks traversed, excluding Summary and including submitted required activities. Otherwise 409 LESSON_REQUIREMENTS_INCOMPLETE. ABANDONED is rejected. Repeated COMPLETED requests return the result without repeating writes (access still checked).

Atomically sets COMPLETED with score snapshot; creates durable LessonProgress linked to this run; consolidates traversed blocks; consolidates Review; updates course completion when appropriate. Score is first submission per distinct lesson activity within this run; optional unanswered activities remain in the denominator, as before. Abandoned attempts are excluded. Every incorrect submission in the accepted run increments an ACTIVE Review item once (or creates one); correct retries do not resolve it. Any failure rolls back all consolidation.

200:
`{ runId, lesson: { id, title }, course: { id, title, level }, result: { correctAnswers, totalActivities, isPerfect, pendingReviewCount }, courseProgress: { completedLessons, totalLessons, percentage, status }, nextLesson: { id, title, accessible, lockReason } | null }`.

Score is snapshotted on the run; course progress, pending Review and next lesson reflect current durable state. No rewards, billing or access grants.

## 10. POST /lessons/:lessonId/runs/:runId/abandon

Empty body. Requires authentication and owned run belonging to this lesson. ACTIVE becomes ABANDONED with timestamp and null pointer; repeated ABANDONED succeeds without further effects. COMPLETED returns 409 LESSON_RUN_NOT_ACTIVE. Access/publication revocation does not prevent abandoning an owned run.

200: `{ runId, status: "ABANDONED" }`.

Retains run attempts/traversal but writes no durable learning state. Mobile sends this on confirmed exit and navigates immediately even when offline; the next new start safely abandons a stale ACTIVE.

### Shared run failures

- 400 INVALID_LESSON_ID / INVALID_RUN_ID / INVALID_STEP_ID.
- 401 unauthenticated; 404 LESSON_RUN_NOT_FOUND for missing/mismatched ownership or lesson.
- 409 LESSON_RUN_NOT_ACTIVE for writes to completed/abandoned runs (except documented idempotent complete/abandon).
- 404 STEP_NOT_FOUND; 409 STEP_NOT_AVAILABLE for skipping required predecessors.
- Existing COURSE_NOT_STARTED, LESSON_PREREQUISITE_REQUIRED, LESSON_ACCESS_REQUIRED, LESSON_NOT_FOUND and LESSON_HAS_NO_CONTENT gates remain.

Old implicit `/lessons/:lessonId/start`, `/steps/:stepId/complete`, `/steps/:stepId/attempt` and `/complete` routes are removed. Replay uses its dedicated endpoint below and creates no run.

## Authentication boundary for Lessons v1

Reuse the existing replaceable application-level authentication boundary:

```text
request
  -> auth middleware
      -> req.auth.userId
          -> controller
              -> LessonService / Activity service
```

Lessons/Activities services receive the application user id and must not parse provider-specific tokens.

## Service-layer responsibility for Lessons v1

Controllers remain thin. Services own decisions such as:

- lesson visibility and publication;
- parent-course started state;
- prerequisite eligibility;
- commercial access;
- step derivation/order;
- run lifecycle and current-step selection;
- activity validation;
- attempt numbering;
- Review-item creation/update;
- completion eligibility;
- next-lesson/course-progress derivation.

Persistence remains isolated behind repositories/Prisma.

## Implementation boundary for Lessons v1

Implement only the minimum supporting logic required for these contracts.

Do not expand this slice into:

- full Review sessions/screens;
- final coins/streak economy;
- payments/paywall purchasing;
- admin/CMS;
- assessments;
- diagnostic behavior;
- notification behavior;
- media-provider-specific playback analytics.

Mobile may attempt both matching interaction modes, but `TAP` is the required reliable fallback and `DRAG` may be deferred if it requires disproportionate gesture/layout complexity. The REST contract must remain unchanged either way.


---

# Lessons Content Contract v2

The high-fidelity mobile learning flow requires richer public content than the original Lessons v1 payloads provide.

The detailed backward-compatible evolution is defined in:

`docs/lesson-content-contract-v2.md`

Key additions planned before the next high-fidelity mobile pass:

- TEXT segments with explicit pedagogical emphasis.
- EXAMPLE variants, especially structured DIALOGUE turns.
- optional audio metadata on dialogue turns/key phrases/activity context.
- optional structured activity context for TEXT, DIALOGUE and IMAGE.
- richer SUMMARY payloads with subtitle, takeaways and key phrases.
- reliable activity-completion metadata when derivable.
- course metadata in lesson completion Result.

Lessons v1 progression, scoring, Review, access and completion semantics remain unchanged.

Implementation should prefer extending JSONB-backed content/configuration and public sanitization/serialization before introducing schema migrations.

Content Contract v2 implementation: GET lesson now also returns `activityProgress` (completed/total ACTIVITY blocks, including optional, based on persisted user traversal). Completion Result now returns `course: { id, title, level }`. See the implementation notes in `docs/lesson-content-contract-v2.md` for nested allowlists, optional-field handling, media URL validation and compatibility. These additions do not alter required progression or first-attempt score.


## Lessons Session Semantics v1

Implemented by the explicit run routes above. GET is read-only; normal entry is fresh and only completion consolidates durable state. See lesson-session-semantics-v1.md and database-schema.md.

## Lessons Replay Semantics v1 — POST /lessons/:lessonId/replay/steps/:stepId/check

Checks an answer for an authenticated learner's COMPLETED lesson without persisting an attempt. Body is the same Answer as the normal activity endpoint: selectedOptionId, text, or pairs according to activity type.

Success (200), dedicated response:

```json
{
  "isCorrect": false,
  "feedback": {
    "message": "Incorrect answer",
    "correctAnswer": "hello",
    "explanation": "Hello is a greeting."
  }
}
```

correctAnswer follows the normal checker representation; explanation is included only when configured. There is no attempt ID, attempt number, progress or Review state. Mobile uses lessonsApi.replayCheck, not attempt, and derives local progress/activity count/first-submission accuracy.

The service reuses lesson/access resolution, step derivation and checkAnswer. It requires a PUBLISHED lesson and course, current commercial access, user lesson status COMPLETED, a step belonging to this lesson and ACTIVITY_STEP type. It does not require historical optional-step traversal.

Failures: 400 INVALID_LESSON_ID / INVALID_STEP_ID / INVALID_ANSWER; 401 unauthenticated; 403 LESSON_ACCESS_REQUIRED; 404 LESSON_NOT_FOUND / STEP_NOT_FOUND; 409 LESSON_REPLAY_REQUIRES_COMPLETION / STEP_IS_NOT_ACTIVITY. Existing prerequisite resolution also applies to non-completed lessons before the Replay-specific check.

The repository read transaction uses RepeatableRead and SET TRANSACTION READ ONLY. PostgreSQL rejects accidental writes; the service only reads and evaluates the answer. No ActivityAttempt, ReviewItem, LessonBlockProgress, LessonProgress, CourseProgress, LearningDay, coins or streak changes occur. No migration or replay session table.

Replay finishes locally after all session steps; it never calls run start, abandon, attempt or complete. NORMAL_RUN uses the explicit run routes above. Replay is separate from future Review.

## Completion boundary: ACTIVE 0–99%, COMPLETED 100%

A pedagogical requirement is a required block whose type is not SUMMARY; a required ACTIVITY also requires a valid submission in this run, regardless of correctness. Required-step counters exclude Summary and optional-only steps. ACTIVE percentage is capped at 99; only a successfully committed COMPLETED run returns 100.

The mutation that satisfies the final requirement (content traversal or activity submission) also consolidates completion in that same transaction. Failure rolls back the final attempt/traversal and all durable effects. Responses include status and completion (the normal Result payload, or null while ACTIVE). A nonempty lesson with no required pedagogical blocks completes during start; empty lessons remain rejected.

Summary is post-completion presentation, excluded from prerequisites and completion validation even if marked required in legacy content. Mobile shows the last feedback, then Summary and Result locally from the persisted completion payload. Neither requires a network call or further submission. Closing after 100% preserves COMPLETED and reopening enters Replay. Back after completion exits directly, without abandonment.

An immediate retry offered on the final feedback is now post-completion: it uses the existing read-only replay check, leaves the run closed and cannot alter its first-attempt score or Review. Earlier retries within ACTIVE runs remain persisted and numbered normally. No new Practice/Review session is introduced.

POST run complete remains an idempotent confirmation/result read for completed runs (and validates eligibility if ACTIVE); mobile does not rely on it to reach completion. Optional unanswered activities remain in the existing score denominator.
