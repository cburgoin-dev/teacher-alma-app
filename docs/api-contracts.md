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
- Incorrect attempts create/update Review data; an immediate retry does not silently resolve that Review item.
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

For an in-progress lesson, `currentStepId` identifies the step at whose beginning the client should resume.

For a completed lesson, content remains readable/repeatable; reading it does not clear completion or create a new scored run.

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

## 6. POST /lessons/:lessonId/start

### Purpose

Explicitly start or resume an accessible lesson.

### Preconditions

The backend must verify:

1. Valid/authenticated user.
2. Visible/published lesson.
3. Parent course already has learner progress or is completed.
4. Sequential prerequisite is satisfied.
5. Commercial access is satisfied.

The endpoint must **not** create `course_progress` implicitly.

### Success response

`200 OK`

```json
{
  "lessonId": "lesson-uuid",
  "status": "IN_PROGRESS",
  "currentStepId": "step-opaque-id",
  "progress": {
    "completedSteps": 0,
    "totalSteps": 4,
    "percentage": 0
  }
}
```

### Idempotency and resume

- First successful start creates `lesson_progress`.
- Repeating start for an `IN_PROGRESS` lesson returns its existing state and does not duplicate progress.
- Resume occurs at the **start of the last meaningful pending/current step**.
- Exact scroll offsets and video timestamps are intentionally not restored.
- Starting a previously completed lesson for review must not erase the original completion or first-attempt score. A future explicit repeat-session model may be introduced if product needs require scored replays.

### Relevant failures

- `400 INVALID_LESSON_ID`
- `401` unauthenticated
- `403 LESSON_ACCESS_REQUIRED`
- `404 LESSON_NOT_FOUND`
- `409 COURSE_NOT_STARTED`
- `409 LESSON_PREREQUISITE_REQUIRED`
- `409 LESSON_HAS_NO_CONTENT`
- `500` unexpected failure

---

## 7. POST /lessons/:lessonId/steps/:stepId/complete

### Purpose

Advance through a non-activity presentation step such as `CONTENT_STEP`. `SUMMARY_STEP` may also use this operation only to mark its content traversed; formal lesson completion still requires the dedicated lesson-complete operation.

### Request body

None.

### Behavior

The service:

1. Resolves the current derived step structure.
2. Validates that `stepId` belongs to the requested lesson.
3. Rejects silent skipping of required future steps.
4. Marks all blocks represented by that traversed step as completed where applicable.
5. Advances the lesson's current step pointer to the next meaningful pending step.
6. Returns updated lesson progress.

For a video-containing content step, pressing Continue is sufficient for traversal in MVP v1; no full-playback requirement applies.

### Success response

`200 OK`

```json
{
  "lessonId": "lesson-uuid",
  "completedStepId": "step-opaque-id",
  "currentStepId": "next-step-opaque-id",
  "progress": {
    "completedSteps": 1,
    "totalSteps": 4,
    "percentage": 25
  }
}
```

### Idempotency

Repeating completion for an already completed step must not duplicate progress or other side effects.

### Relevant failures

- `400 INVALID_LESSON_ID` / `INVALID_STEP_ID`
- `401` unauthenticated
- `403 LESSON_ACCESS_REQUIRED`
- `404 LESSON_NOT_FOUND` / `STEP_NOT_FOUND`
- `409 LESSON_NOT_STARTED`
- `409 STEP_NOT_AVAILABLE`
- `409 ACTIVITY_REQUIRES_ATTEMPT` when an activity step is incorrectly sent to this endpoint
- `500` unexpected failure

---

## 8. POST /lessons/:lessonId/steps/:stepId/attempt

### Purpose

Submit an answer for an `ACTIVITY_STEP`, persist the attempt, return immediate feedback, update block/lesson progression and create/update Review state when incorrect.

### Request body

The answer payload depends on activity type.

Examples:

```json
{ "selectedOptionId": "a" }
```

```json
{ "text": "am" }
```

```json
{
  "pairs": [
    { "wordId": "w1", "imageId": "i1" }
  ]
}
```

The matching payload is identical for `TAP` and `DRAG`.

### Atomic behavior

A successful submission is one application operation:

```text
validate answer
  -> create activity_attempt
  -> derive attempt_number
  -> mark ACTIVITY block traversed/completed
  -> advance current step when appropriate
  -> incorrect: create/update ACTIVE review_item
  -> return feedback
```

These dependent writes should succeed/fail consistently.

### Score and retries

- The first submitted lesson-context attempt for an activity is its score-bearing result for that lesson.
- Later retries are stored with higher `attemptNumber`.
- A retry may return correct feedback but does not change the first-attempt lesson score.
- Correct retry inside the lesson does not automatically resolve the active Review item created by the original error.

### Success response

`200 OK`

```json
{
  "attempt": {
    "id": "attempt-uuid",
    "attemptNumber": 1,
    "isCorrect": false,
    "countsForLessonScore": true
  },
  "feedback": {
    "message": "Casi. Con I usamos am.",
    "correctAnswer": "am",
    "explanation": "..."
  },
  "review": {
    "pending": true
  },
  "progress": {
    "currentStepId": "next-step-opaque-id",
    "completedSteps": 2,
    "totalSteps": 4,
    "percentage": 50
  }
}
```

Correct-answer details are returned **after submission** as feedback when appropriate; they are not exposed by the lesson-read endpoint beforehand.

### Relevant failures

- `400 INVALID_LESSON_ID` / `INVALID_STEP_ID` / `INVALID_ANSWER`
- `401` unauthenticated
- `403 LESSON_ACCESS_REQUIRED`
- `404 LESSON_NOT_FOUND` / `STEP_NOT_FOUND`
- `409 LESSON_NOT_STARTED`
- `409 STEP_NOT_AVAILABLE`
- `409 STEP_IS_NOT_ACTIVITY`
- `500` unexpected failure

---

## 9. POST /lessons/:lessonId/complete

### Purpose

Formally complete a lesson after all required traversal/submission conditions are satisfied and return the data required by Lesson Result.

### Completion validation

The backend must verify:

- every required non-activity content block/step has been traversed;
- every required activity has at least one submitted attempt;
- the required Summary step has been traversed;
- the lesson is started and accessible.

Correctness is **not** a completion condition.

### Success response

`200 OK`

```json
{
  "lesson": {
    "id": "lesson-uuid",
    "title": "Nice to meet you!"
  },
  "result": {
    "correctAnswers": 1,
    "totalActivities": 2,
    "isPerfect": false,
    "pendingReviewCount": 1
  },
  "courseProgress": {
    "completedLessons": 4,
    "totalLessons": 8,
    "percentage": 50,
    "status": "IN_PROGRESS"
  },
  "nextLesson": {
    "id": "next-lesson-uuid",
    "title": "Verb to be",
    "accessible": true,
    "lockReason": null
  }
}
```

For Lesson v1:

- `correctAnswers` is derived from the **first submitted attempt** of each relevant activity.
- `totalActivities` counts relevant score-bearing activities in the lesson.
- `isPerfect` means every relevant activity was correct on its first submitted attempt.
- `pendingReviewCount` is derived from active Review items originating from this lesson.
- Exact coin reward and streak payloads are intentionally omitted until Gamification v1 defines their rules.

If no next lesson exists, `nextLesson` is `null`.

If the next lesson exists but is commercially locked, it may be returned with `accessible: false` and `lockReason: "ACCESS"` so Result can adapt its CTA without violating access rules.

### Side effects

Allowed on first successful completion:

- mark `lesson_progress = COMPLETED`;
- set `completed_at`;
- update/derive parent `course_progress`, including course completion when the last required lesson is completed.

Not part of Lessons v1 completion:

- granting entitlements;
- creating purchases;
- hardcoded coin rewards;
- hardcoded streak mutation.

Review items should already have been created by incorrect attempt operations rather than being reconstructed only at completion.

### Idempotency

Repeated successful completion calls must return the existing completed result without:

- duplicating lesson completion;
- duplicating Review items;
- duplicating course-completion effects;
- awarding future rewards more than once when Gamification is later integrated.

### Relevant failures

- `400 INVALID_LESSON_ID`
- `401` unauthenticated
- `403 LESSON_ACCESS_REQUIRED`
- `404 LESSON_NOT_FOUND`
- `409 LESSON_NOT_STARTED`
- `409 LESSON_REQUIREMENTS_INCOMPLETE`
- `500` unexpected failure

---

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
- resume/current-step selection;
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
