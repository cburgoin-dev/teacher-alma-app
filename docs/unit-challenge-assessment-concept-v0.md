# Unit Challenge / Assessment Concept v0

Status: **product/architecture concept only**. This document records the current direction discussed for a future Assessment / Unit Challenge vertical. It is not yet a source of truth for schema, API contracts, unlock rules or implementation details.

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

The current preferred starting point is:

- one distinctive mechanic such as **Crossword**;
- one lower-cost scenario mechanic such as **Conversation Challenge**;
- reuse existing Activity types as supporting phases where useful.

Sentence Builder and Listening Challenge can follow later if they justify their implementation/content cost.

## Completion and scoring direction

Current product direction:

- the learner should complete the Unit Challenge to finish/close the Topic;
- the first version should **not require a minimum score threshold to continue**;
- the result may still show accuracy/score and areas to reinforce.

This favors completion and feedback rather than hard-blocking progress because of a low score.

Example:

```text
8 / 10

¡Unidad completada!
Hay algunos temas que puedes reforzar.
```

Future mastery medals/badges or threshold-based rules remain possible, but are not approved for v1.

## Feedback direction

Assessment may differ from normal Lessons in feedback timing and presentation.

The existing general Assessment note in business rules already allows:
- total score;
- different feedback timing;
- retry rules;
- configurable passing thresholds.

For Unit Challenge specifically, the exact feedback model is still open. A challenge may benefit from less immediate coaching than a Lesson so it better reflects retained knowledge, but this has not yet been frozen.

## Review interaction — OPEN

It is not yet decided how Unit Challenge errors interact with Review.

Options discussed:

1. Every incorrect challenge answer produces/reactivates Review.
2. Challenge errors never affect Review.
3. Hybrid mapping:
   - reused normal Activities can feed the existing Review lifecycle;
   - challenge-specific mechanics such as individual crossword cells do not automatically become ReviewItems unless they map cleanly to an underlying reusable Activity/concept.

The hybrid model currently appears promising, but this remains explicitly **unapproved** until Assessment semantics are designed.

Do not implement Review coupling from this concept document.

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

## Questions that remain open

These should be explicitly resolved before creating Assessment v1 contracts:

1. Exact Topic -> Unit Challenge cardinality: always one, optional by course, or configurable?
2. Exact unlock rule: all required Topic lessons completed, or another condition?
3. Does completion always unlock the next Topic regardless of score?
4. Feedback timing: per phase, at end, or mixed?
5. Retry model: immediate phase retry, whole-challenge retry, or later replay?
6. How challenge errors map to ReviewItem, if at all.
7. Whether Assessment attempts need a durable session/run entity similar to LessonRun.
8. How a composed challenge snapshots phases/order for concurrency/content edits.
9. Access semantics if entitlement expires during an active challenge.
10. What learner history/result data should persist.
11. Whether a Final Course Challenge belongs in the initial product.
12. Exact initial mechanic set for implementation.
13. Content-authoring/import format for Crossword and composed challenge phases.
14. Whether Unit Challenge completion contributes differently to streak/rewards/coins.

## Recommended next step

Do not implement this concept yet solely because it is documented.

When Assessment becomes the active vertical:

```text
Concept v0
  -> resolve open product semantics
  -> Assessment Semantics v1
  -> data model/schema
  -> API contracts
  -> backend slice
  -> mobile slice
  -> physical/visual iterations
```

This keeps the current idea preserved without prematurely locking implementation details.
