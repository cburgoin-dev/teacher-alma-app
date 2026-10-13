# Diagnostic API Contract v1

Status: proposed HTTP contract for Diagnostic v1, derived from `docs/diagnostic-semantics-v1.md`. Product semantics remain authoritative if this document is later found to conflict with them.

Diagnostic is an authenticated learner-facing placement flow. It recommends a point of entry in the current Teacher Alma catalog; it does not certify CEFR proficiency, mutate learning progression, create Review debt or award Gamification state.

## 1. Design principles

- Backend is authoritative for Diagnostic availability, question order, answer validation, scoring and recommendation.
- Mobile must never receive answer keys, correctness, weights, target levels, scoring thresholds or recommendation rules while an attempt is active.
- Diagnostic reuses the shared Activity public/validation engine rather than introducing a second exercise contract.
- Attempts are intentionally non-resumable in v1.
- Network retries must nevertheless be idempotent.
- The final answer submission completes/scorers the attempt atomically; there is no separate learner-facing `complete` call.
- Diagnostic never starts a course. Course Detail/Courses retain start/access ownership.
- Current recommended-course progress/access is projected from the Courses domain rather than persisted as Diagnostic-owned course state.

## 2. Endpoints

Authenticated v1 endpoints:

```text
GET  /diagnostic
POST /diagnostic/attempts
POST /diagnostic/attempts/:attemptId/questions/:questionId/submit
POST /diagnostic/attempts/:attemptId/abandon
GET  /diagnostic/result
```

V1 intentionally has no endpoint for resuming/recovering an ACTIVE attempt and no public attempt-history endpoint.

All identifiers are UUIDs unless explicitly noted otherwise.

## 3. Shared public Activity contract

Diagnostic questions expose the same sanitized Activity shapes already used by Lessons.

Conceptually:

```ts
type DiagnosticActivity =
  | MultipleChoiceActivity
  | FillBlankOptionsActivity
  | FillBlankTextActivity
  | MatchWordImageActivity;
```

Supported v1 types:

```text
MULTIPLE_CHOICE
FILL_BLANK_OPTIONS
FILL_BLANK_TEXT
MATCH_WORD_IMAGE
```

The exact public per-type fields follow the existing shared Activity/Lessons contract. Diagnostic must not create subtly different option, text or matching answer shapes.

Private Activity configuration must never be exposed, including:

- `correctOptionId`;
- `acceptedAnswers`;
- canonical matching pairs;
- correctness/explanation before completion;
- Diagnostic `weight`;
- Diagnostic `targetLevel`.

## 4. Shared Diagnostic question projection

```ts
type DiagnosticQuestion = {
  id: string;
  position: number;
  totalQuestions: number;
  activity: DiagnosticActivity;
};
```

`position` is one-based learner-facing position.

The question projection intentionally omits scoring metadata and correct-answer information.

## 5. Recommended-course projection

Diagnostic does not own a parallel course-state model.

When a recommended course is currently learner-visible, result responses may include a compact projection using existing Courses semantics:

```ts
type DiagnosticRecommendedCourse = {
  id: string;
  title: string;
  description: string | null;
  level: string | null;
  coverUrl: string | null;
  status: "PUBLISHED" | "COMING_SOON";
  progress: null | {
    status: "IN_PROGRESS" | "COMPLETED";
    completedLessons: number;
    totalLessons: number;
    completedUnitChallenges: number;
    totalUnitChallenges: number;
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

The values above must be derived with the same rules used by Courses/Home. Diagnostic must not calculate a second percentage, entitlement source or course progress state.

Navigation remains a Mobile/Courses concern based on the existing course state:

- `progress = null` -> Course Detail;
- `IN_PROGRESS` -> normal in-progress destination, currently Roadmap;
- `COMPLETED` -> normal completed-course destination, currently Roadmap/review route behavior;
- `recommendedCourse = null` -> no broken course action; `Explorar cursos` remains available.

Diagnostic API must not return presentation instructions such as `buttonLabel`, `routeName` or `shouldStartCourse`.

## 6. GET /diagnostic

### Purpose

Return the current learner-facing Diagnostic intro metadata and availability.

This is a read-only request. It never creates/abandons an attempt.

### Success response

`200 OK`

Available example:

```json
{
  "available": true,
  "diagnostic": {
    "id": "diagnostic-uuid",
    "title": "Descubre tu nivel",
    "version": 1,
    "questionCount": 10,
    "estimatedMinutes": 5
  }
}
```

Unavailable example:

```json
{
  "available": false,
  "diagnostic": null
}
```

`estimatedMinutes` is nullable/optional authored editorial metadata. It does not imply a timer or expiration.

### Availability rules

`available = true` only when the backend can safely start the current published definition under `diagnostic-semantics-v1.md`.

At minimum:

- exactly one current definition is `PUBLISHED`;
- definition/questions/scoring configuration are valid;
- it has evaluable questions;
- it has at least two useful reachable learner-facing entry levels;
- **every recommendation level reachable by the published rules currently resolves to a valid learner-facing `PUBLISHED` course**.

A Premium `PUBLISHED` course remains a valid destination. `COMING_SOON`, `DRAFT` and archived courses do not satisfy publication-time destination validation.

This endpoint returns `200 available=false`, rather than turning normal content unavailability into a 404/500 condition.

### Failures

- `401` unauthenticated.
- `500` unexpected server failure.

## 7. POST /diagnostic/attempts

### Purpose

Explicitly start a fresh Diagnostic attempt against the current available published definition.

Diagnostic v1 is non-resumable. A genuinely new start supersedes any stale/previous owned ACTIVE attempt.

### Request

```json
{
  "requestKey": "client_generated_stable_key"
}
```

`requestKey` follows the same transport-idempotency principle used by Lesson/Unit Challenge starts. Recommended implementation validation is the existing stable key shape (`[A-Za-z0-9_-]`, 16-100 chars) unless a shared request-key utility later centralizes it.

### Success response

`200 OK`

```json
{
  "attempt": {
    "id": "attempt-uuid",
    "status": "ACTIVE",
    "answeredQuestions": 0,
    "totalQuestions": 10
  },
  "question": {
    "id": "question-uuid",
    "position": 1,
    "totalQuestions": 10,
    "activity": {
      "id": "activity-uuid",
      "type": "MULTIPLE_CHOICE",
      "prompt": "Choose the best answer.",
      "options": [
        { "id": "a", "text": "..." },
        { "id": "b", "text": "..." }
      ]
    }
  }
}
```

The exact Activity subtype fields follow the shared Activity contract.

### Start/idempotency semantics

- The same authenticated user + same accepted `requestKey` identifies the same start intention.
- A transport retry with the same key must not create a second attempt.
- If that keyed attempt is still ACTIVE, return the same start outcome/current initial response needed by the retry.
- Reusing a key whose attempt is already ABANDONED or COMPLETED is a conflict; client-generated keys are not reusable across genuine starts.
- A genuinely new request key may abandon/replace an existing owned ACTIVE attempt before creating the new attempt.
- Replacement/abandonment and new attempt creation must be transactionally consistent.

No previous completed result is erased by starting a retake.

### Business rules

- Diagnostic must currently be `available=true` under section 6.
- Starting is allowed even when the learner already has course progress; retakes do not mutate that progress.
- The attempt binds to the current PUBLISHED Diagnostic version.
- The question order is fixed by that version's `position` values.
- No CourseProgress, Review or Gamification mutation occurs.

### Failures

- `400 INVALID_DIAGNOSTIC_REQUEST_KEY`
- `401` unauthenticated
- `409 DIAGNOSTIC_UNAVAILABLE`
- `409 DIAGNOSTIC_START_REQUEST_CONFLICT` for an invalid reuse of an already consumed/non-active start key
- `500` unexpected server failure

## 8. POST /diagnostic/attempts/:attemptId/questions/:questionId/submit

### Purpose

Submit the one final learner answer for the current Diagnostic question.

The endpoint either returns the next public question or, when this was the final question, completes the attempt atomically and returns the result.

### Path parameters

- `attemptId`: UUID.
- `questionId`: UUID.

### Request

```json
{
  "requestKey": "client_generated_submission_key",
  "answer": {
    "selectedOptionId": "b"
  }
}
```

`answer` uses the existing shared answer shape for the Activity type:

- options -> `{ selectedOptionId }`;
- text -> `{ text }`;
- matching -> `{ pairs: [...] }`.

There is no `skip`/`noSé` payload in v1. A question requires a valid answer according to its Activity type.

### Non-final success response

`200 OK`

```json
{
  "attempt": {
    "id": "attempt-uuid",
    "status": "ACTIVE",
    "answeredQuestions": 4,
    "totalQuestions": 10
  },
  "question": {
    "id": "next-question-uuid",
    "position": 5,
    "totalQuestions": 10,
    "activity": {
      "id": "activity-uuid",
      "type": "FILL_BLANK_TEXT",
      "prompt": "Complete the sentence.",
      "caseSensitive": false
    }
  }
}
```

No `isCorrect`, feedback, explanation, score, answer key, weight, targetLevel or recommendation information is returned.

### Final success response

`200 OK`

```json
{
  "attempt": {
    "id": "attempt-uuid",
    "status": "COMPLETED",
    "answeredQuestions": 10,
    "totalQuestions": 10,
    "completedAt": "2026-10-13T17:00:00.000Z"
  },
  "result": {
    "attemptId": "attempt-uuid",
    "completedAt": "2026-10-13T17:00:00.000Z",
    "recommendedLevel": "A2",
    "recommendedCourse": {
      "id": "course-a2-uuid",
      "title": "Inglés A2",
      "description": "Continúa desarrollando tus bases de inglés.",
      "level": "A2",
      "coverUrl": "/demo-media/a2.png",
      "status": "PUBLISHED",
      "progress": null,
      "access": {
        "hasFullAccess": false,
        "hasFreeContent": true,
        "source": "NONE"
      }
    },
    "strengths": null,
    "reinforcementAreas": null
  }
}
```

`recommendedCourse`, `strengths` and `reinforcementAreas` are nullable.

The internal score and target-level scores are deliberately absent from learner-facing v1 responses.

### Ordering/finality rules

- `attemptId` must belong to the authenticated user.
- Attempt must be ACTIVE for a new submission.
- `questionId` must belong to the attempt's bound Diagnostic definition.
- It must be exactly the first unanswered question by configured position.
- A submitted answer is final and cannot be pedagogically retried or edited.
- Mobile does not navigate back to finalized questions.

### Submission idempotency

Diagnostic submissions should follow the robust request-key/hash pattern already established by Unit Challenge:

- validate a stable `requestKey`;
- canonicalize/validate the answer through the shared Activity engine;
- persist the accepted answer, request key and a deterministic payload hash;
- preserve enough accepted response data to return the same transport outcome for an exact retry;
- same key + same accepted question/payload -> return previous accepted response;
- same key + different question or payload -> `409 DIAGNOSTIC_SUBMISSION_CONFLICT`;
- new key against an already finalized question -> `409 DIAGNOSTIC_QUESTION_ALREADY_SUBMITTED`.

Transport retry does not mean pedagogical retry.

### Final-answer atomicity

When the submitted question is the last unanswered question, one write transaction must perform the academic completion boundary:

1. persist/finalize the DiagnosticAnswer;
2. calculate weighted overall score;
3. calculate required target-level scores;
4. evaluate versioned recommendation rules in configured order;
5. select the first matching/fallback `recommendedLevel`;
6. resolve the current recommended `PUBLISHED` course for that level when possible;
7. persist the attempt's immutable result snapshot (`internalScore`, `recommendedLevel`, `recommendedCourseId`, optional qualitative result, `completedAt`, status `COMPLETED`);
8. persist the idempotent public submission response/receipt as required by the chosen implementation;
9. commit.

No half-completed state should be externally observable where the last answer exists but the attempt is still ACTIVE without a result.

If the catalog changed after the attempt started and its recommended level no longer has a current learner-facing course, the academic `recommendedLevel` remains valid; `recommendedCourseId` may be null. New starts should already be unavailable until the publication/catalog invariant is restored.

### Failures

- `400 INVALID_ATTEMPT_ID`
- `400 INVALID_DIAGNOSTIC_QUESTION_ID`
- `400 INVALID_DIAGNOSTIC_SUBMISSION_REQUEST_KEY`
- `400 INVALID_ANSWER`
- `401` unauthenticated
- `404 DIAGNOSTIC_ATTEMPT_NOT_FOUND`
- `404 DIAGNOSTIC_QUESTION_NOT_FOUND`
- `409 DIAGNOSTIC_ATTEMPT_NOT_ACTIVE`
- `409 DIAGNOSTIC_QUESTION_NOT_AVAILABLE`
- `409 DIAGNOSTIC_QUESTION_ALREADY_SUBMITTED`
- `409 DIAGNOSTIC_SUBMISSION_CONFLICT`
- `500` unexpected/invariant failure

## 9. POST /diagnostic/attempts/:attemptId/abandon

### Purpose

Explicitly abandon an ACTIVE attempt when the learner confirms exit.

### Request

No body required.

### Success response

`200 OK`

```json
{
  "attemptId": "attempt-uuid",
  "status": "ABANDONED"
}
```

### Semantics

- ACTIVE -> ABANDONED and set abandonment timestamp.
- Repeating abandon for an already ABANDONED owned attempt is idempotent and returns the same public state.
- COMPLETED attempts cannot be abandoned.
- Abandoning does not alter the learner's latest COMPLETED Diagnostic result.
- Abandoning creates no Review/Gamification/progression side effects.

### Failures

- `400 INVALID_ATTEMPT_ID`
- `401` unauthenticated
- `404 DIAGNOSTIC_ATTEMPT_NOT_FOUND`
- `409 DIAGNOSTIC_ATTEMPT_NOT_ACTIVE` when the attempt is COMPLETED
- `500` unexpected server failure

## 10. GET /diagnostic/result

### Purpose

Return the authenticated learner's current Diagnostic result: the most recently completed attempt.

This endpoint is read-only and is suitable for a later Profile/`Tu nivel` entry or reopening Result after onboarding.

### Success response

`200 OK`

```json
{
  "result": {
    "attemptId": "attempt-uuid",
    "completedAt": "2026-10-13T17:00:00.000Z",
    "recommendedLevel": "A2",
    "recommendedCourse": {
      "id": "course-a2-uuid",
      "title": "Inglés A2",
      "description": "Continúa desarrollando tus bases de inglés.",
      "level": "A2",
      "coverUrl": "/demo-media/a2.png",
      "status": "PUBLISHED",
      "progress": {
        "status": "IN_PROGRESS",
        "completedLessons": 2,
        "totalLessons": 8,
        "completedUnitChallenges": 0,
        "totalUnitChallenges": 4,
        "completedRequiredNodes": 2,
        "totalRequiredNodes": 12,
        "percentage": 17
      },
      "access": {
        "hasFullAccess": true,
        "hasFreeContent": true,
        "source": "SUBSCRIPTION"
      }
    },
    "strengths": null,
    "reinforcementAreas": null
  }
}
```

### Current-vs-historical course semantics

The completed attempt keeps its historical `recommendedCourseId`, but this GET hydrates the recommended course using **current Courses truth**.

- If the persisted recommended course is still learner-visible, return its current progress/access projection.
- If it is no longer learner-visible, return `recommendedCourse: null` while preserving `recommendedLevel`.
- Do not silently replace a historical recommendation with another course merely because the original disappeared.
- A retake creates a later COMPLETED result; the latest completed attempt then becomes current.

The endpoint never starts/routes a course and never mutates Home/progression.

### No-result behavior

When no completed Diagnostic attempt exists:

`404 Not Found`

```json
{
  "error": {
    "code": "DIAGNOSTIC_RESULT_NOT_FOUND",
    "message": "Diagnostic result not found"
  }
}
```

### Failures

- `401` unauthenticated
- `404 DIAGNOSTIC_RESULT_NOT_FOUND`
- `500` unexpected server failure

## 11. Scoring and recommendation privacy

The following are server-only in v1 and must not appear in any active-attempt learner payload:

- `DiagnosticQuestion.weight`;
- `DiagnosticQuestion.targetLevel`;
- `Diagnostic.scoringConfig`;
- rule thresholds/order internals;
- per-level scores;
- `DiagnosticAnswer.isCorrect`;
- Activity private answer config.

A completed learner-facing result returns the recommendation, not the scoring internals. Internal/admin/analytics access can be designed separately later.

## 12. Retakes

No separate `retake` endpoint is required.

A retake is simply another intentional:

```text
POST /diagnostic/attempts
```

with a new `requestKey`, provided Diagnostic remains currently available.

Retaking is allowed regardless of prior Diagnostic completion and regardless of CourseProgress. It never resets or changes existing learning progress.

The most recently COMPLETED attempt becomes the current result only when it completes. An ACTIVE/ABANDONED retake does not displace the previous completed result.

## 13. Home integration

Diagnostic remains owner of Diagnostic availability/result semantics. Home consumes compact projections and must not implement scoring or attempt logic.

When Diagnostic v1 is implemented, `GET /me/home` must be reconciled so that NEW Home presentation can distinguish:

- Diagnostic available -> Diagnostic hero/action may be shown;
- Diagnostic unavailable -> use the real beginner/current catalog path instead.

Existing Home state precedence remains unchanged:

```text
ACTIVE > COURSE_COMPLETED > ASSESSED > NEW
```

A retake while course progress exists does not make Home Diagnostic-first.

Home's ASSESSED recommendation should reuse current Courses truth and navigate according to the same course-state rules; Home must not auto-start the course.

## 14. Expected persistence changes

The existing core entities remain:

```text
Diagnostic
DiagnosticQuestion
DiagnosticAttempt
DiagnosticAnswer
```

The v1 contract is expected to require focused schema evolution rather than a second result table.

### Diagnostic

Expected additions/validation:

- `estimatedMinutes integer null` (positive when present);
- `scoringConfig jsonb not null` or equivalent versioned configuration storage;
- status support/constraints for `DRAFT`, `PUBLISHED`, `ARCHIVED`;
- database/application invariant permitting at most one current `PUBLISHED` definition.

### DiagnosticAttempt

Expected additions/validation:

- stable start `requestKey` for idempotency;
- `abandonedAt timestamptz null`;
- lifecycle constraints for ACTIVE/COMPLETED/ABANDONED;
- uniqueness appropriate to authenticated-user start idempotency;
- existing `internalScore`, `recommendedLevel`, `recommendedCourseId`, strengths/reinforcement and timestamps remain the result snapshot.

### DiagnosticAnswer

Keep the current relation through `diagnosticQuestionId`.

Expected additions for robust submission idempotency may include:

- `submissionRequestKey`;
- `submissionRequestHash`;
- `submissionResponse jsonb` or an equivalent immutable response receipt;
- uniqueness for one answer per attempt/question and request-key reuse within an attempt.

Do not regress to the older conceptual `diagnostic_answers.activity_id`-only model.

## 15. Transaction/concurrency expectations

Implementation should follow the same defensive patterns already established in Unit Challenge where they apply:

- write transactions around start/submit/abandon;
- lock owned ACTIVE attempt before finalizing answer/abandon/completion;
- lock or uniquely constrain the current answer boundary;
- idempotency key + deterministic payload hash for submit retries;
- completion result written in the same transaction as the final accepted answer;
- partial unique constraint or equivalent application/database protection to prevent multiple ACTIVE Diagnostic attempts for one user;
- exact ownership checks on every mutation.

Diagnostic does not need Unit Challenge's content snapshots/resume machinery because published Diagnostic definitions are academically immutable and v1 is non-resumable.

## 16. Validation expectations

Backend implementation should cover at least:

- GET available/unavailable metadata;
- publication validity and all reachable recommendation levels backed by current PUBLISHED courses;
- start idempotency;
- stale ACTIVE replacement on genuine new start;
- ACTIVE -> ABANDONED;
- no resume endpoint/behavior;
- every supported shared Activity type and answer validation;
- deterministic question order;
- rejecting out-of-order/foreign questions;
- no Skip payload;
- no answer-key/correctness leakage;
- answer submission idempotency/conflict behavior;
- weighted overall score;
- target-level weighted scores;
- ordered recommendation-rule selection and fallback;
- atomic final answer -> COMPLETED result;
- no Review/Gamification/LearningDay/CourseProgress side effects;
- retakes preserving prior completed history;
- latest-result selection;
- current recommended-course projection for NOT_STARTED / IN_PROGRESS / COMPLETED / hidden-course cases;
- Home regression around NEW/ASSESSED/ACTIVE precedence after integration;
- PostgreSQL constraint/concurrency behavior where persistence changes are involved.

## 17. Explicitly out of contract for v1

- resumable/recoverable Diagnostic attempts;
- GET active-attempt/current-question recovery endpoint;
- skip / `No sé` semantics;
- per-question correctness feedback;
- answer editing after submit;
- adaptive/IRT question selection;
- random question pools;
- timers/expiration;
- public attempt history;
- detailed score breakdown in learner API;
- formal CEFR certification;
- Diagnostic-owned course-start/access logic;
- Diagnostic Gamification/Review/progression effects;
- admin/content-authoring HTTP APIs.