# Unit Challenge / Assessment Concept v0

Status: **historical/product concept**. The approved v1 behavioral source of truth is now `docs/unit-challenge-semantics-v1.md`. This document preserves the rationale and exploration that led to that semantics document; where they differ, Semantics v1 is authoritative.

## Why this exists

The course experience should not feel like a flat sequence of similar lessons. A learner should periodically encounter a moment that feels special, more demanding and more memorable, while still reinforcing real learning.

A Unit Challenge is intended to:

- consolidate material from several lessons in one Topic;
- require more recall/integration than a single normal lesson activity;
- feel more playful and event-like than a conventional 5-10 question exam;
- add variety and perceived product depth without creating a separate game engine for every idea;
- give the roadmap clear milestones between ordinary lessons.

This remains an educational product feature first. Novelty and visual appeal are useful only when the learner still has to demonstrate knowledge from the Topic.

## Position in the learning structure

Current conceptual placement:

```text
Course
└── Topic
    ├── Lesson
    ├── Lesson
    ├── Lesson
    └── Unit Challenge
```

The working direction is one Unit Challenge near the end of a Topic, after the lessons that teach the required material.

A possible future Course/Final Challenge may exist at the end of a course, but it is not yet approved as an MVP requirement.

## Relationship to existing verticals

### Lesson

Lessons teach and practice new material. They can contain content, examples, media, hints, immediate feedback and retries according to Lesson semantics.

### Review

Review reinforces concrete previously consolidated mistakes. It is short, reactive and tied to ReviewItem lifecycle.

### Unit Challenge / Assessment

A Unit Challenge evaluates and consolidates knowledge from multiple lessons in a Topic through a more substantial, playful experience.

It is not:
- another normal Lesson;
- saved-error Review;
- future free Practice;
- a generic list of exam questions;
- an excuse to introduce unrelated game mechanics.

The existing reusable Activity engine should be reused whenever practical. New interaction types are justified only when they add meaningful variety or assessment value.

## Experience target

A first-time Unit Challenge should ideally create a small "this is different" moment.

Target characteristics:

- roughly 5-8 minutes as an initial product target;
- more demanding than one Lesson activity;
- visually recognizable as a milestone;
- still approachable on mobile;
- objective enough to score/assess;
- sufficiently reusable that content creation does not become prohibitively expensive.

Difficulty should primarily come from recall, comprehension and combining learned material, not from trick questions or arbitrary punishment.

## Challenge as a composition

The preferred direction is for a Unit Challenge to be a **container composed of one or more phases**, rather than making the whole challenge synonymous with one minigame type.

Conceptual example:

```text
Unit Challenge: "La cafetería"

Phase 1 · Conversation scenario
Phase 2 · Crossword
Phase 3 · Existing/reused activity
Result
```

Different Topics can combine the available mechanics differently. This avoids making every Unit Challenge feel identical while keeping the number of engines small.

The exact number of phases is not yet frozen. A small 2-3 phase experience is the current working direction.

## Candidate mechanics

The long-term concept may support a small library of challenge-oriented mechanics. The goal is not to implement all of them immediately.

### 1. Crossword

Current strongest candidate for the first distinctive mechanic.

Why it fits:
- encourages active vocabulary recall rather than only recognition;
- visually differs from normal Lesson activities;
- works naturally for language learning;
- can be kept small enough for mobile;
- can use clues in English, Spanish or contextual prompts as content design requires;
- objective answers make scoring straightforward.

A challenge crossword should be purpose-built for mobile rather than a large newspaper-style grid. A small set such as roughly 5-8 answers is the current conceptual direction, not a fixed rule.

### 2. Conversation Challenge

A scenario spanning several connected decisions, for example greeting someone, introducing yourself and responding appropriately.

It can reuse much of the current activity/dialogue/audio infrastructure while presenting the sequence as one coherent situation rather than unrelated questions.

This is a strong candidate for an early Assessment version because it provides variety at lower implementation cost.

### 3. Sentence Builder

Future candidate.

The learner assembles a sentence from words/tokens in the correct order. It may eventually become a reusable Activity type if it proves valuable beyond Assessments.

### 4. Listening Challenge

Future candidate.

The learner must understand audio with reduced textual scaffolding, then answer or reconstruct meaning. It becomes more valuable once production audio/voice infrastructure is mature.

## Initial implementation direction

Do **not** treat "1-4 challenge types" as a requirement to implement four engines at once.

The approved v1 starting set is:

- **Crossword**;
- **Conversation Challenge**.

A generic learner-facing normal Activity phase is not part of Unit Challenge v1. Lower-level implementation primitives may still be reused internally where useful.

Sentence Builder and Listening Challenge can follow later if they justify their implementation/content cost.

## Completion and scoring direction

Approved v1 direction:

- the learner must pass the Unit Challenge to finish/close the Topic for progression;
- `passingScore` is configurable and nullable;
- when `passingScore = null`, completing a valid run is sufficient to pass;
- when a threshold is configured, a completed run below that threshold is preserved but does not yet pass the Topic milestone;
- the result may show accuracy/score and areas to reinforce.

See `unit-challenge-semantics-v1.md` for authoritative run/replay/progression rules.

Example:

```text
8 / 10

¡Unidad completada!
Hay algunos temas que puedes reforzar.
```

Future mastery medals/badges remain deferred. Threshold behavior itself is now approved as nullable/configurable v1 semantics.

## Feedback direction

Assessment may differ from normal Lessons in feedback timing and presentation.

The existing general Assessment note in business rules already allows:
- total score;
- different feedback timing;
- retry rules;
- configurable passing thresholds.

Unit Challenge v1 withholds correctness feedback during the challenge. Submitted evaluable answers are recorded without immediate correct/incorrect coaching; academic feedback is concentrated in Result.

## Review interaction — v1 resolved

Unit Challenge errors do not create, increment, reactivate or resolve `ReviewItem` records in v1.

The Result may communicate areas to reinforce from Assessment data without mutating the existing Review lifecycle. Future explicit Assessment-to-Review mapping remains a separate design decision.

## Roadmap

Unit Challenge should eventually have a visually distinct roadmap node so that it reads as a milestone rather than another Lesson.

Conceptually the roadmap will eventually need to represent:
- ordinary Lesson nodes;
- Unit Challenge nodes;
- current position;
- completed/locked state.

This is directly tied to the previously discussed London-bus/current-position idea.

Current approved product direction:
- the bus is not merely a future visual experiment;
- implementing a London-style bus/current-position marker is intended to be part of the same roadmap refinement work that introduces Unit Challenge nodes;
- it should be treated as an early visible piece of the Assessment/Roadmap integration slice, while remaining frontend presentation rather than Assessment domain logic;
- the bus should represent the learner's current position/progression on the route and must not become an independent progression source.

Because Unit Challenge adds a new node type, the roadmap refinement should be designed once around both ordinary Lesson nodes and Unit Challenge milestone nodes, with the bus/current-position treatment integrated from the start.

## Free-content / commercial product hypothesis

A stronger free experience may improve the learner's understanding of what they are paying for.

Current hypothesis:

Instead of exposing only one or two isolated free lessons, the free portion of a course could, where content economics allow, expose a **representative complete learning cycle**, for example:

```text
Topic 1 · Free
- lessons
- media/audio
- varied activities
- Unit Challenge

Topic 2 · Paid
Topic 3 · Paid
...
```

The intent is for a learner to experience the product's real depth, variety and progression before reaching the paywall.

This is **not yet a fixed monetization rule**. Exact free scope, course pricing, subscription inclusion and permanent-course purchase remain subject to validation with Alma and real users.

## Perceived value without artificial padding

Unit Challenge can contribute to course value and variety, but it should not be used to inflate duration artificially.

A course should feel substantial because it contains:
- useful explanations/content;
- varied practice;
- meaningful media;
- reinforcement;
- milestone challenges;
- visible progression;

not because lessons or challenges are padded to increase minutes or item counts.

## Results and gamification

Unit Challenge will eventually need its own result state.

Do not design the final result system in isolation yet. Lesson Result, Review Result and future Assessment Result are likely to benefit from a later shared Results/Gamification polish pass once rewards, streaks, coins, celebrations and other feedback systems are defined.

Assessment v0 should therefore avoid hard-coding a final reward language prematurely.

## Architecture direction

The current architecture already leaves room for Assessment:

- `ActivityAttempt.context` includes `ASSESSMENT` conceptually/in schema documentation;
- business rules already state that formal assessments should reuse the same activity engine where possible.

This concept does not define:
- new Prisma models;
- API endpoints;
- attempt/session persistence;
- schema for phases;
- unlock queries;
- result persistence;
- content-import format.

Those belong to Assessment Semantics/Data/API design immediately before implementation.

## Product-semantics resolution status

The behavioral questions that blocked Assessment v1 contracts are now resolved in `unit-challenge-semantics-v1.md`, including:

- one Unit Challenge per published Topic;
- unlock after all required Topic Lessons;
- nullable configurable passing threshold;
- minimal/no correctness feedback during the run;
- no same-run phase retry and whole-challenge replay later;
- no ReviewItem coupling in v1;
- durable resumable runs with content snapshots;
- entitlement freeze for an already-started run;
- durable result/history semantics;
- initial `CONVERSATION` + `CROSSWORD` phase set;
- deterministic Crossword authoring/import expectations;
- Roadmap node-type and current-position integration;
- admin/CMS explicitly out of MVP scope.

Still intentionally deferred from v1 product semantics:
- Final Course Challenge;
- exact coin/streak/reward behavior;
- future Assessment-to-Review mapping;
- additional challenge mechanics.

## Recommended next step

Assessment is now the active vertical:

```text
Concept v0
  -> Unit Challenge Semantics v1 [DONE]
  -> data model/schema [NEXT]
  -> API contracts
  -> backend slice
  -> mobile slice
  -> physical/visual iterations
```

The next design work should extend existing models/contracts instead of duplicating already-defined Course, Lesson, Roadmap or access concepts.
