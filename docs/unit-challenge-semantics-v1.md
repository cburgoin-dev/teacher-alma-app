# Unit Challenge Semantics v1

Status: **approved product/domain semantics for the Unit Challenge v1 vertical**.

This document resolves the product semantics that were intentionally left open in `unit-challenge-assessment-concept-v0.md`. It is the source of truth for Unit Challenge lifecycle, progression, scoring, phase behavior and roadmap integration before data-model/schema/API implementation.

It does **not** yet define Prisma models, endpoint paths or transport DTOs. Those belong to the next design step and must preserve these semantics.

## 1. Purpose and placement

A Unit Challenge is a short, special assessment milestone at the end of a Topic.

It should:
- consolidate material learned across multiple Lessons in the Topic;
- require recall/integration rather than ordinary guided practice;
- feel more immersive, playful and memorable than a normal Lesson activity;
- remain objective enough to score;
- stay practical on mobile.

Published course structure becomes conceptually:

```text
Course
└── Topic
    ├── Lesson
    ├── Lesson
    ├── ...
    └── Unit Challenge
```

Each learner-facing Topic that belongs to published/available course content has exactly **one** Unit Challenge in v1.

Draft/import workflows may temporarily contain an incomplete Topic while content is being prepared, but a Topic exposed to learners as part of published/available course content must not be considered valid without its Unit Challenge. `Topic` itself does not need a new publication-status column for this rule.

A future Course/Final Challenge is outside v1.

## 2. Relationship to Lessons and Review

### Lessons

Lessons teach and practice content. They may provide:
- explanations;
- hints;
- immediate correctness feedback;
- retries;
- ordinary Activity types.

A Unit Challenge evaluates retained knowledge after those Lessons.

### Review

Review remains the reinforcement lifecycle for qualifying Lesson errors.

Unit Challenge errors do **not** create, increment, reactivate or resolve `ReviewItem` records in v1.

The Unit Challenge Result may communicate areas to reinforce using its own result data, but this must not silently mutate the existing Review lifecycle.

Future explicit mapping between assessment items and Review may be designed later.

## 3. Unlock rule

A Unit Challenge becomes progression-available when **all required Lessons in its Topic are completed**.

Optional Lessons, if introduced later, do not block Unit Challenge unlock.

Commercial access is a separate concern from progression eligibility.

Therefore a challenge can conceptually be:
- progression-locked because required Lessons are incomplete;
- progression-available but commercially inaccessible;
- accessible;
- already passed/completed for progression and available for replay, subject to current commercial access.

Existing roadmap learning/access states should be reused rather than replaced with a duplicate Unit Challenge-specific status vocabulary.

## 4. Passing threshold and Topic progression

A Unit Challenge has an optional configurable `passingScore`.

Semantics:

- `passingScore = null`: completing a valid run passes the Unit Challenge for progression.
- `passingScore != null`: the completed run passes only when its normalized score meets or exceeds the configured threshold.

The system must support both modes even if the initial production content uses only one of them.

Finishing a run and passing the Unit Challenge are distinct concepts.

Example:

```text
passingScore = 70

Run 1 -> 60% -> run COMPLETED, challenge not yet passed
Run 2 -> 80% -> run COMPLETED, challenge passed
```

Once a Unit Challenge has been passed for progression:
- the Topic remains passed/completed;
- later replays cannot revoke progression;
- a worse later score cannot relock following content.

Passing the Unit Challenge completes/closes its Topic for progression and allows the normal progression rules to expose the next required node/Topic, subject to commercial access.

## 5. Unit Challenge composition

A Unit Challenge is an ordered container of phases.

v1 supports exactly these learner-facing phase types:

- `CONVERSATION`
- `CROSSWORD`

Do not expose a generic normal `ACTIVITY` phase in Unit Challenge v1.

Implementation may reuse lower-level Lesson/Activity primitives internally when useful, but the learner-facing experience must remain a Unit Challenge-specific mechanic rather than an ordinary Lesson activity inserted into the flow.

The phase model must be extensible so future mechanics such as Sentence Builder or Listening Challenge can be added without redesigning the whole lifecycle.

The exact phase count is content-configurable. A small 2–3 phase experience remains the intended product shape.

## 6. Run lifecycle

Starting a Unit Challenge creates or resumes a durable challenge run.

Conceptual run statuses:

- `ACTIVE`
- `COMPLETED`
- `ABANDONED`

A run must preserve enough snapshot data to ensure that later content edits do not change the meaning, order, scoring or result of an already-started run.

### Resume

An accidental interruption such as:
- app close;
- process death;
- temporary connectivity loss;
- normal backgrounding

must not force the learner to restart the assessment.

The same `ACTIVE` run should be resumable from its persisted state.

### Explicit exit

If the learner intentionally exits the Unit Challenge before completion:
- the UI should confirm the exit when appropriate;
- that run becomes `ABANDONED`;
- returning later starts a new run rather than resuming the abandoned one.

An abandoned run does not contribute to passing/progression.

## 7. Access freeze for an active run

Commercial access is validated when starting a new Unit Challenge run.

If the learner legitimately starts a run and the entitlement later expires while that run is active, the learner may finish that already-started run.

A new run or replay must revalidate current commercial access.

This mirrors the product principle that an in-progress learning flow should not be interrupted by mid-flow entitlement expiration.

## 8. Feedback semantics

Unit Challenge is an assessment, not ordinary guided practice.

Therefore v1 minimizes correctness feedback during the challenge.

During a phase, Mobile may advance through local interaction state without revealing correctness. The durable server submission boundary in v1 is the **whole phase**, not each individual Conversation choice/crossword word.

When the phase is submitted:
- record the complete phase answer set;
- do not reveal correct/incorrect;
- do not provide corrective explanation;
- continue to the next phase/challenge.

Neutral interaction feedback such as “respuesta registrada” or phase-transition affordances is allowed, provided it does not reveal correctness.

Academic correctness, score and areas to reinforce are concentrated in the final Result.

## 9. Retry and replay

There is no same-run retry of a submitted evaluable item/phase.

Before submitting a phase, the learner may edit answers freely and Mobile may progress through a Conversation locally.

After phase submission:
- the submitted answers are final for that run;
- the phase cannot be retried;
- the learner advances.

If the app is interrupted in the middle of an **unsubmitted** phase, v1 only guarantees resume from the last durably submitted phase boundary. Unsaved local choices/cells inside the current phase may need to be entered again. This keeps v1 persistence small and deterministic; finer-grained draft persistence can be added later if physical testing shows it is necessary.

After the Unit Challenge run ends, the whole Unit Challenge may be replayed later from the Roadmap, subject to commercial access.

Each replay creates a separate run/history entry.

## 10. Empty answers

A learner may submit a phase with unanswered evaluable items.

Unanswered items count as incorrect.

The UI may confirm phase submission when unanswered items remain, but it must not force the learner to guess merely to continue.

This prevents one unknown answer from becoming a hard navigation blocker.

## 11. Scoring

The Unit Challenge score is based on **evaluable items**, not on a simple number-of-phases ratio.

Each evaluable item contributes one point in v1.

No per-item or per-phase weighting is required in v1.

Conceptual example:

```text
Conversation -> 4 evaluable choices
Crossword    -> 6 answer words

Total        -> 10 evaluable items
Correct      -> 8
Score        -> 8/10 = 80%
```

The run result should preserve:
- correct item count;
- total evaluable item count;
- normalized score/percentage as needed;
- submitted responses;
- timestamps;
- the snapshot/configuration needed to interpret the run historically.

The system may derive first, latest and best scores from run history. A replay never replaces or mutates prior run history.

## 12. Conversation phase semantics

A `CONVERSATION` phase represents one coherent scene rather than a visually unrelated sequence of Multiple Choice cards.

Conceptually it contains:
- title;
- optional scenario/context;
- participants;
- ordered steps.

v1 step roles:

### Message step

Non-evaluable dialogue/context.

May contain:
- speaker identity;
- text;
- optional real audio metadata when available.

It contributes no score.

### Choice step

Evaluable learner decision.

Contains:
- optional prompt/context;
- selectable options;
- exactly one correct option in v1.

Each Choice step contributes one evaluable item.

Selecting a choice advances the Conversation interaction locally without revealing correctness. The complete set of selected Choice answers is persisted when the Conversation phase is submitted.

Open text, speech recognition and multiple-correct-option semantics are outside v1.

A Conversation phase should contain at least one evaluable Choice. Product content should normally use several connected choices so the mechanic feels like a scene rather than a single ordinary question.

## 13. Crossword phase semantics

A `CROSSWORD` phase is authored as a deterministic crossword layout.

The mobile client must not be required to invent/generate a crossword layout at runtime.

Conceptually the phase contains:
- width;
- height;
- ordered/listed entries.

Each entry contains:
- stable id;
- clue;
- canonical answer;
- direction: `ACROSS` or `DOWN`;
- start row;
- start column.

Each crossword answer word contributes one evaluable item.

The learner may edit the crossword freely before submitting the phase.

On phase submission:
- each complete/correct normalized word scores one point;
- incomplete/empty words score zero;
- the phase becomes final for that run;
- correctness is not revealed immediately.

### Answer normalization

v1 validation should:
- trim surrounding whitespace;
- compare case-insensitively;
- apply a consistent Unicode normalization strategy.

Do not introduce broad fuzzy matching that treats materially different words as equivalent.

### Content validation

Content/import validation should reject structurally invalid crosswords, including:
- entries outside the declared grid;
- incompatible intersecting letters;
- duplicate entry ids;
- empty answers;
- invalid direction values.

The product target is approximately **5–8 answer words** for a typical Mini-Crossword. This is a content guideline rather than a database-level invariant.

## 14. Result semantics

A completed run leads to a Unit Challenge Result.

Result should communicate:
- Unit/Topic completion state;
- score/accuracy;
- short supportive result copy;
- areas/skills reinforced when supported by real result/content data;
- the next progression action.

Do not hard-code:
- coin amounts;
- streak changes;
- medals/mastery tiers;
- fabricated Review actions;
- other reward systems not yet formally defined.

If `passingScore` is configured and the learner does not meet it, Result must communicate that another full attempt is needed for progression without framing the learner as having failed as a person or using punitive presentation.

## 15. Roadmap integration

The Roadmap now contains at least two node content types:

- `LESSON`
- `UNIT_CHALLENGE`

This **adds node type**, not a duplicate node-state system.

Existing roadmap learning/access state semantics remain authoritative:
- `COMPLETED`
- `CURRENT`
- `AVAILABLE`
- `LOCKED_PREREQUISITE`
- `LOCKED_ACCESS`

Learning progression and commercial access remain separate concerns.

### Current position

The learner's current route position is the first required progression node that has not yet been completed/passed.

If that node is commercially locked, it can still be the learner's curricular/current position even though entering it requires access.

### Unit Challenge as Topic boundary

Within a Topic, required Lessons precede its Unit Challenge.

When the last required Lesson becomes complete:
- the Unit Challenge becomes progression-eligible/current;
- the Roadmap may visually advance the learner to that node.

When the Unit Challenge is passed:
- the Topic becomes complete for progression;
- the next required node/Topic may become current/available;
- commercial access is evaluated separately.

## 16. Bus/current-position presentation

The London-style bus/current-position marker is part of the Roadmap refinement associated with this vertical.

The bus:
- represents derived learner progression/current position;
- is frontend presentation;
- must never become an independent source of progression truth.

The backend/API should provide sufficient node/progression truth for mobile to derive where the bus belongs without persisting visual path geometry or animation state.

## 17. Progress animation behavior

Lesson Result and Unit Challenge Result should return the learner to the Roadmap as the preferred progression path so the learner can see route advancement.

Preferred product direction:
- use a primary action such as `Continuar en la ruta` / `Ver progreso`;
- do not bypass the Roadmap by default with a direct `Siguiente lección` CTA.

On return immediately after new progression, mobile may animate the transition from the previous known route state to the new state, for example:
1. completed node treatment;
2. route segment fills/turns blue;
3. bus moves to the new current node;
4. newly available or commercially locked next node is revealed/emphasized.

These animations are presentation only.

Opening the Roadmap normally at a later time should display current truth directly rather than replay historical progression animations every visit.

The existing initial-positioning behavior remains useful and distinct from “just progressed” animation.

## 18. Sound and motion

Sound/motion do not require a separate product vertical before they can be introduced.

The Unit Challenge/Roadmap slice is an appropriate first place to establish reusable motion/sound primitives because it contains meaningful milestone events.

Initial high-value candidates include:
- route segment completion;
- bus movement;
- node unlock;
- Unit Challenge completion.

Motion/sound must:
- remain optional presentation;
- never carry required information alone;
- respect accessibility/reduced-motion expectations;
- avoid blocking normal navigation for unnecessary cinematic duration.

A broad app-wide sound/reward system is outside this semantics document.

## 19. Authoring and admin scope

A dedicated admin/CMS is **not part of this vertical or MVP scope**.

Unit Challenge content still needs a deterministic import/seed/content format so initial content can be loaded and maintained without learner-facing hardcoding.

Do not build an admin panel as a side effect of Assessment work.

The data/content model should remain compatible with a future private authoring/admin tool if one is later justified.

## 20. Explicitly deferred

The following remain outside Unit Challenge v1 semantics unless separately approved:

- Course/Final Challenge;
- Sentence Builder;
- Listening Challenge;
- speaking/speech recognition;
- open-text Conversation answers;
- Unit Challenge -> ReviewItem coupling;
- mastery medals/tiers;
- fixed Unit Challenge coin/streak rewards;
- admin/CMS;
- runtime crossword generation;
- weighted scoring;
- app-wide sound/gamification redesign.

## 21. Next contract-design step

With these semantics approved, the next work is:

```text
Unit Challenge Semantics v1
  -> data model
  -> database schema
  -> API contracts
  -> backend implementation
  -> mobile implementation
  -> physical-device / visual-polish iterations
```

Schema/API design should reuse existing course, lesson, access and roadmap concepts wherever they already satisfy these semantics instead of introducing duplicate models/statuses.
