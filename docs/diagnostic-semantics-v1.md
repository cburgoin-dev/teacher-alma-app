# Diagnostic v1 semantics

Status: product semantics frozen for HTTP/API design. Final production questions, thresholds, recommendation values and pedagogical wording remain configurable content owned by Alma/content authoring.

Diagnostic is the learner-facing placement flow used to recommend a sensible starting point inside the currently available Teacher Alma course catalog. It is not a CEFR certification exam, does not prove formal proficiency and must not mutate durable learning progression merely because the learner demonstrates prior knowledge.

## 1. Scope and purpose

Diagnostic v1 is a short optional placement experience intended primarily for new learners.

Its responsibilities are:

- evaluate a small ordered set of reusable Activities;
- produce an internal placement score;
- recommend a starting level;
- resolve a current learner-facing recommended course when possible;
- persist a historical completed result;
- allow a learner to retake the Diagnostic later without rewriting prior attempts.

Diagnostic v1 explicitly does **not**:

- certify CEFR proficiency;
- complete Lessons, Topics, Unit Challenges or Courses;
- create CourseProgress, LessonProgress or UnitChallengeProgress;
- create Review items;
- award coins, streak credit, Daily Goal progress or LearningDays;
- grant Premium/content access;
- automatically start the recommended course;
- use an adaptive/IRT testing engine;
- expose correctness feedback while the attempt is active;
- provide resume/recovery UX for an interrupted attempt.

The result means: **recommended point of entry inside Teacher Alma's current offering**, not an authoritative statement such as `Your English level is B2`.

Preferred learner-facing language is therefore equivalent to:

- `Te recomendamos empezar en A2`;
- `Tu nivel recomendado: A2`;
- `Un buen punto de partida para ti`.

Avoid certification-style language unless a future separately validated assessment product is introduced.

## 2. Availability

Diagnostic is optional and should only be exposed when it can make a useful placement decision.

A Diagnostic is learner-available only when all of the following are true:

1. exactly one current Diagnostic definition is `PUBLISHED` for new attempts;
2. the published definition is structurally valid;
3. it has at least one valid evaluable question;
4. its scoring/recommendation configuration is valid;
5. the recommendation rules can resolve at least **two distinct useful entry levels** represented by current learner-facing `PUBLISHED` courses.

Commercial access does not invalidate a destination. A `PUBLISHED` Premium course is still a valid academic recommendation because Diagnostic recommends where the learner should begin; Course Detail/access flows explain whether the learner currently has access.

`COMING_SOON`, `DRAFT` and archived/non-learner-facing courses do not count as current useful destinations for Diagnostic availability.

Consequences:

- only A1 `PUBLISHED` -> Diagnostic hidden/unavailable;
- A1 `PUBLISHED` + A2 `COMING_SOON` -> Diagnostic hidden/unavailable;
- A1 `PUBLISHED` + A2 `PUBLISHED` -> Diagnostic may be available;
- A1 free + A2 Premium but `PUBLISHED` -> Diagnostic may be available.

Availability is a backend/product decision. Home, Profile and Mobile must not independently infer it from locally visible course cards.

When Diagnostic is unavailable, learner-facing surfaces must not expose a dead `Hacer diagnóstico` action.

## 3. Diagnostic definition lifecycle

Diagnostic definitions are versioned learning content.

Supported conceptual statuses for v1:

- `DRAFT` — editable/preparation state; unavailable to learners;
- `PUBLISHED` — the single current definition used for new attempts;
- `ARCHIVED` — historical definition retained for existing attempts/results; unavailable for new attempts.

At most one Diagnostic may be `PUBLISHED` for new attempts at a time.

Publishing a replacement version should conceptually transition the previous current version to `ARCHIVED` and the new version to `PUBLISHED` atomically or with equivalent consistency guarantees.

### Published immutability

A `PUBLISHED` Diagnostic is academically immutable.

Changing any of the following requires a new Diagnostic version rather than silently mutating the published definition:

- question set;
- question order;
- referenced Activity content/correct answer semantics;
- weights;
- target-level metadata;
- scoring thresholds;
- recommendation rules.

Diagnostic v1 does not require per-attempt question-content snapshots if this immutability rule is enforced correctly.

Because `DiagnosticQuestion` references reusable `Activity` rows, an Activity referenced by a `PUBLISHED` Diagnostic must not be destructively edited in a way that changes that published assessment. Reuse of the **Activity engine** is required; reuse of the exact same mutable Activity row across unrelated authored contexts is not required. When independent evolution is needed, create/version separate Activity content rather than mutating historical Diagnostic meaning.

## 4. Public metadata / intro experience

The Diagnostic intro should be able to render production-like information from backend/configuration rather than hardcoded Mobile strings.

Required public metadata should include or allow derivation of:

- Diagnostic identity/title;
- `questionCount`, derived from the current published question set;
- optional estimated duration;
- availability/startability.

### Estimated duration

Diagnostic v1 should support an optional authored `estimatedMinutes` value so Mobile can present realistic production copy such as `~5 minutos` or equivalent.

`estimatedMinutes` is editorial metadata, not a timing enforcement rule. It does not expire the attempt, restrict answer time or participate in scoring.

The exact production value remains content-configurable. Demo/mock data may use a representative value so the Mobile design can be evaluated in a production-like state before Alma finalizes the real duration.

The Intro may visually show:

- short explanation;
- question count;
- estimated duration when present;
- `Comenzar diagnóstico`;
- `Ahora no` / normal navigation away.

Do not fabricate duration when the field is absent.

## 5. Attempt lifecycle

Supported attempt statuses for v1:

- `ACTIVE`;
- `COMPLETED`;
- `ABANDONED`.

### Start

Starting Diagnostic creates an `ACTIVE` attempt against the current `PUBLISHED` Diagnostic version.

Start transport must be idempotent: an HTTP/network retry of the same start intention must not create duplicate attempts.

Diagnostic v1 is intentionally **not resumable** as a learner-facing behavior.

If the user explicitly exits an active Diagnostic, Mobile should confirm the exit. Confirmed exit transitions the attempt to `ABANDONED`.

If the application dies or the client cannot send an abandon request, the server must not depend on client cleanup for correctness. A later genuine start may abandon/replace a stale owned `ACTIVE` attempt before establishing the new attempt.

There is no `PAUSED`, `RESUMABLE` or `EXPIRED` state in v1.

### Completion

An attempt becomes `COMPLETED` only after every configured Diagnostic question has a finalized submitted answer and the server has atomically calculated/persisted the placement result.

Completion persists at least:

- internal normalized score;
- recommended level;
- recommended course id when one can be resolved at completion time;
- completion timestamp;
- optional qualitative result data only when it is backed by real configured metadata/logic.

A completed attempt is immutable history.

## 6. Retakes and current result

Retakes are supported.

Each retake creates a new DiagnosticAttempt. Historical completed attempts are never overwritten or repurposed.

The learner's current Diagnostic result is the **most recently completed** attempt. Starting a new attempt does not erase or invalidate the prior completed result while the new attempt remains `ACTIVE` or becomes `ABANDONED`.

There is no retake cooldown in v1.

Retake entry is secondary after onboarding, conceptually suitable for a future Profile/`Tu nivel` surface rather than remaining a dominant Home action forever.

### Retakes after course progress exists

Diagnostic recommendation and learning progression remain separate.

A learner may retake Diagnostic after:

- starting the previously recommended course;
- making progress in it;
- completing it;
- starting another course.

A new Diagnostic result must **not**:

- reset or rewrite current course progress;
- switch the active course automatically;
- mark earlier coursework complete/incomplete;
- force the learner back to a lower recommended course;
- auto-start a newly recommended course.

Home's existing precedence remains authoritative: an in-progress course still makes Home `ACTIVE`, and completed-course context still outranks `ASSESSED`. A retake changes Diagnostic history/recommendation, not Home into a competing Diagnostic-first state while real course progress exists.

## 7. Question set and ordering

Diagnostic v1 uses the complete configured question set for the published version.

Questions are ordered deterministically by `DiagnosticQuestion.position`.

V1 does not:

- randomize order;
- draw a random subset;
- adaptively branch based on previous answers;
- change question count during an attempt.

Question count is content-configurable through the authored question set and is not hardcoded to `10`.

A future version may add randomization/adaptive selection only when the content bank and pedagogical validation justify it.

## 8. Shared Activity engine and visual consistency

Diagnostic must reuse the existing Activity semantics/rendering rather than create a second exercise system.

Current reusable Activity types include:

- `MULTIPLE_CHOICE`;
- `FILL_BLANK_OPTIONS`;
- `FILL_BLANK_TEXT`;
- `MATCH_WORD_IMAGE`.

Backend public sanitization and answer validation should reuse/extract the existing Activity engine used by Lessons instead of copying correctness logic into Diagnostic.

Mobile should likewise reuse shared Activity presentation primitives and the established learning-flow visual language where practical:

- progress bar;
- activity prompt/content rendering;
- answer selection/input controls;
- primary CTA rhythm;
- typography/spacing/button primitives;
- accessibility behavior.

Diagnostic should feel like one coherent Teacher Alma learning/evaluation experience, not a disconnected screen set implemented at a later date.

The semantic difference from Lessons is deliberate:

```text
Lesson:     answer -> check -> correctness/explanation -> optional retry/continue
Diagnostic: answer -> submit -> next question
```

## 9. Question interaction semantics

Each question has one final submitted answer per attempt.

Before submission, Mobile may freely change the current local selection/input.

After the server accepts the answer:

- it is final for that attempt;
- it cannot be edited;
- the learner cannot navigate back and resubmit a different answer;
- the flow advances to the next question or completes the attempt.

### No immediate correctness feedback

While an attempt is `ACTIVE`, Diagnostic must not expose:

- `isCorrect`;
- correct answer/key;
- explanation that reveals correctness;
- score contribution;
- target-level scoring internals.

The learner therefore cannot leave after seeing a correct answer and restart merely to reproduce revealed answers, because correctness is not disclosed during the active test.

### No per-question retry

There is no pedagogical retry for a submitted Diagnostic question in v1.

Transport retries are different from pedagogical retries: the same accepted submission may be returned idempotently after a network retry, but a new answer to an already finalized question is rejected.

### No Skip in v1

The historical mockup `Saltar` action is not part of the approved v1 behavior.

Diagnostic is measuring whether the learner can answer the presented item. V1 does not introduce a third scoring state merely for skip/unanswered behavior.

A future product revision may introduce an explicit `No sé`/skip semantic if Alma finds it pedagogically valuable, but it must then define how it affects scoring rather than being a presentation-only shortcut.

## 10. Scoring model

Diagnostic v1 uses simple deterministic weighted scoring, not an adaptive or statistical proficiency model.

Each DiagnosticQuestion may define:

- `weight > 0`;
- optional `targetLevel` string such as `A1`, `A2`, `B1`.

`targetLevel` is intentionally data-driven rather than a hardcoded TypeScript enum so future levels/path labels can be added without changing the scoring engine.

### Overall score

For each finalized question:

- correct -> contributes its configured `weight`;
- incorrect -> contributes `0`.

The internal normalized score is:

```text
overallScore = correctWeight / totalWeight * 100
```

This score is internal placement data and does not need to be shown numerically to the learner.

### Target-level scores

For each non-null `targetLevel`, calculate a weighted score over questions assigned to that target level:

```text
levelScore(level) = correctWeightForLevel / totalWeightForLevel * 100
```

Questions with `targetLevel = null` contribute to `overallScore` but do not contribute to any per-level score.

## 11. Recommendation configuration

Recommendation logic must be versioned/configurable with the Diagnostic definition rather than hardcoded as A1/A2/B1 `if` statements in the service.

Conceptual configuration:

```json
{
  "recommendationRules": [
    {
      "level": "A2",
      "minOverallScore": 70,
      "requirements": [
        { "targetLevel": "A1", "minScore": 75 }
      ]
    },
    {
      "level": "A1",
      "minOverallScore": 0,
      "requirements": []
    }
  ]
}
```

The numbers above are illustrative/demo thresholds only and are **not** final pedagogical values.

Evaluation is deterministic:

1. calculate overall score;
2. calculate available per-target-level scores;
3. evaluate recommendation rules in configured order;
4. the first rule whose `minOverallScore` and every requirement are satisfied wins;
5. configuration must include a deterministic fallback rule.

A requirement may reference only a targetLevel actually measured by at least one question in the same Diagnostic version.

This structure allows simple prerequisite-style placement, e.g. recommending A2 only when overall performance is sufficient **and** foundational A1 performance is sufficient.

The exact physical persistence shape (for example `Diagnostic.scoringConfig JSONB`) is finalized with the Diagnostic API/schema implementation, but the behavior above is canonical for v1.

## 12. Recommendation range and catalog scope

Diagnostic evaluates entry points Teacher Alma can meaningfully offer; it is not required to span the full CEFR scale.

If Teacher Alma currently offers A1 and A2, the published Diagnostic may be designed to distinguish A1 vs A2.

If only A1 is available, Diagnostic should normally remain unavailable because every result would lead to the same useful entry point.

If B1 is introduced later, a new Diagnostic version can add B1 questions/rules without rewriting historical attempts.

A learner who performs perfectly on an A1/A2 Diagnostic must not automatically be labeled B1/C1 when those levels were not evaluated. The result may instead communicate that the learner showed strong command of the evaluated content while recommending the highest meaningful available entry point.

## 13. Recommended-course resolution

Scoring produces a `recommendedLevel` first. Course resolution is a separate catalog concern.

For v1, resolve the current recommended course deterministically from learner-facing `PUBLISHED` courses whose `level` exactly matches `recommendedLevel`.

If several current courses share the level, prefer course `position` order as the deterministic v1 entry-course rule.

Diagnostic completion freezes the resolved course id in `DiagnosticAttempt.recommendedCourseId` when a course is available at completion time.

Do not embed purchase/access semantics into scoring rules. `recommendedLevel` answers the academic placement question; the Courses/access layer answers what the learner can currently open/use.

## 14. Result semantics

A completed result must remain useful even when optional qualitative metadata is absent.

Required conceptual result data:

- attempt id/reference;
- completedAt;
- recommendedLevel;
- current/historical recommendedCourse relationship when resolvable;
- enough current course state for Mobile to choose a truthful navigation presentation without owning Courses business rules.

Optional result data:

- strengths;
- reinforcement areas.

Strengths/reinforcement must be omitted/null unless they come from real configured pedagogical metadata and deterministic result logic. Mobile must not infer `Grammar`, `Vocabulary`, `Saludos`, etc. from titles or arbitrary question positions.

### Course action ownership

Diagnostic never starts a course.

For a recommendation whose course has not been started, the result action is conceptually:

`Ver curso recomendado` -> Course Detail

Course Detail remains responsible for explaining:

- course content;
- current progress if reached through this path;
- Premium/access state;
- `COMING_SOON`/unavailable state where relevant;
- the intentional `Comenzar curso` action when appropriate.

Diagnostic must not call the course-start mutation as a side effect of Result.

### Result after the recommended course was later started/completed

The persisted Diagnostic result is historical evidence of what was recommended; current course progress may evolve independently.

When rendering a result later, its course presentation should adapt to the **current** course state rather than pretending the learner has not acted on the recommendation.

Conceptual behavior:

- recommended course still not started -> `Ver curso recomendado` -> Course Detail;
- recommended course currently `IN_PROGRESS` -> show truthful in-progress state and route using the existing course-state/navigation rules (normally Roadmap rather than offering `Comenzar` again);
- recommended course `COMPLETED` -> show completed state; do not tell the learner to begin it again; allow the normal completed-course route/review behavior;
- persisted recommended course no longer learner-visible -> keep `recommendedLevel`, omit the broken course action, offer `Explorar cursos` or equivalent current catalog navigation.

A retake may produce a new recommendation even while another course is active/completed. The new result is informational and does not automatically change the learner's active learning state.

## 15. Home integration

Home keeps its existing durable-state precedence:

1. `ACTIVE` when a course is in progress;
2. `COURSE_COMPLETED` when there is no in-progress course but completed course progress exists;
3. `ASSESSED` when there is a completed Diagnostic and no course progress with higher precedence;
4. `NEW` otherwise.

Diagnostic availability refines the NEW presentation:

- `NEW` + Diagnostic available -> Home may strongly recommend `Hacer diagnóstico`;
- `NEW` + Diagnostic unavailable -> Home must fall back to a real beginner/current catalog entry path rather than expose a dead Diagnostic CTA.

Completing or retaking Diagnostic never forces Home out of `ACTIVE`/`COURSE_COMPLETED` when those durable course facts exist.

Home may consume a compact latest-result projection but should not duplicate scoring or attempt lifecycle logic.

## 16. Gamification, Review and learning boundaries

Diagnostic is neutral to the normal learning/gamification systems in v1.

Completing or answering Diagnostic must not:

- create/increment ReviewItem;
- create ActivityAttempt rows intended for Lesson/Review scoring unless an explicit shared persistence decision is later approved;
- award/spend coins;
- create GamificationLearningEvent;
- create LearningDay;
- advance/protect/repair streak;
- advance Daily Goal;
- unlock Roadmap progression;
- create CourseProgress;
- complete Lesson/Unit Challenge/Course state.

A wrong Diagnostic answer does not imply the learner has previously learned that content and therefore must not create normal Review debt.

## 17. Privacy and answer-key boundary

Diagnostic public payloads reuse the same allowlist/sanitization principle as Lessons Activities.

Before submission, Mobile receives only public Activity data required to render the current question.

Do not expose:

- correct answer config;
- accepted-answer keys;
- private matching pairs;
- `isCorrect`;
- explanation that reveals correctness;
- weight;
- targetLevel;
- recommendation thresholds/rules.

All scoring and recommendation decisions are server authoritative.

## 18. Idempotency and atomicity expectations

Transport retries must not alter academic meaning.

Required semantics:

- repeated same start request -> same start outcome, not duplicate attempt;
- one finalized answer per attempt/question;
- an exact retry of an already accepted submission may return the prior accepted outcome;
- a conflicting new answer for an already finalized question is rejected;
- answering the final question and completing/scoring the attempt must be atomic or equivalently consistent.

The exact request-key/hash mechanics belong in `docs/diagnostic-api-contract-v1.md`.

## 19. Content validation expectations

A Diagnostic cannot be treated as valid/publishable when, at minimum:

- it has no questions;
- question positions are invalid/duplicated;
- referenced Activities are inactive/invalid;
- a question weight is non-positive;
- recommendation rules are empty/invalid;
- thresholds are outside `0..100`;
- duplicate/ambiguous rule configuration makes precedence non-deterministic;
- a requirement references an unmeasured targetLevel;
- there is no deterministic fallback;
- recommendation configuration cannot produce the intended useful current entry levels.

Published-content validation should fail explicitly rather than silently changing rules at runtime.

## 20. Mobile screen direction

Diagnostic v1 has three primary learner-facing surfaces.

### Intro

Purpose: explain the optional placement flow and let the learner start intentionally.

May show:

- Diagnostic title;
- concise explanation;
- real questionCount;
- real optional estimatedMinutes;
- short benefits/expectations;
- primary `Comenzar diagnóstico`;
- secondary `Ahora no`.

### Question flow

Focused/immersive experience using shared learning/Activity primitives.

Show:

- back/exit control;
- `Diagnóstico` context;
- `position de questionCount`;
- progress bar;
- current public Activity;
- one dominant submit/next action.

No bottom navigation while actively taking the test.

The historical `Saltar` control is not a v1 requirement.

### Result

Primary hierarchy:

- `Resultado del diagnóstico`;
- recommended starting level;
- short non-certification explanation;
- optional strengths/reinforcement only when real;
- recommended-course card when currently resolvable;
- action following the current course state and existing Courses navigation semantics;
- `Explorar otros cursos` as a secondary route where useful.

Do not include the obsolete historical `Compra única` path. Current monetization is subscription-first and commercial access belongs to Course Detail/access flows, not Diagnostic scoring/result ownership.

## 21. Mockup interpretation

The existing supplied Diagnostic mockups are historical visual references, not business-rule contracts.

Approved interpretation for future Mobile implementation:

- Home NEW mockup: useful visual reference for the `Descubre tu nivel` entry when Diagnostic is actually available;
- Diagnostic Intro mockup: strong primary direction; duration/count must use real backend/config values rather than literal historical numbers;
- Question mockup: useful visual direction, but reuse current shared Activity/learning primitives and omit historical `Saltar` unless product semantics change;
- A1 Result mockup: preferred primary result composition direction;
- B2/commercial Result mockup: secondary visual inspiration only; `Compra única`, direct purchase choice and obsolete monetization wording do not belong to current v1.

The images should be copied into `docs/mockups/diagnostic/` with a README defining primary/secondary precedence during the first Diagnostic Mobile implementation task, following the repository's existing mockup workflow.

## 22. Expected persistence evolution

The current schema already provides the core domain entities:

- Diagnostic;
- DiagnosticQuestion;
- DiagnosticAttempt;
- DiagnosticAnswer.

Diagnostic v1 implementation is expected to verify/introduce only the persistence needed by the frozen semantics, likely including:

- versioned/configurable recommendation/scoring configuration on Diagnostic;
- optional estimatedMinutes editorial metadata;
- explicit attempt abandonment metadata if required for lifecycle/audit;
- start/submission idempotency support if existing constraints are insufficient.

Do not add a separate persisted `diagnostic_result` table unless implementation reveals a real need; the completed DiagnosticAttempt remains the natural result snapshot for v1.

`docs/data-model.md` contains older wording for DiagnosticAnswer that should be reconciled to the actual/current relation through `diagnostic_question_id`; do not regress the implementation back to an obsolete direct-only `activity_id` shape.

## 23. Explicitly deferred

Deferred from Diagnostic v1:

- adaptive question selection / IRT;
- randomized subsets/question pools;
- timed questions or test expiration;
- resumable attempts;
- per-question correctness feedback/retry;
- formal CEFR certification claims;
- detailed skill analytics without real metadata;
- Listening/Speaking-specific scoring systems not already supported by the Activity engine;
- AI-generated placement decisions;
- Diagnostic-derived automatic lesson/course completion;
- Diagnostic gamification rewards;
- retake cooldowns;
- complex mapping for multiple specialist courses at the same level beyond the deterministic v1 course-position rule.
