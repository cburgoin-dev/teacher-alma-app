# Placement / diagnostic flow

This document records the current functional definition of the optional English placement/diagnostic flow. It is intentionally lightweight and can evolve after client validation.

## Purpose

The diagnostic is an **optional, short, orientative placement test**. Its goal is not to certify a CEFR level, but to answer a practical product question:

> Where should this learner start inside the app?

The result should guide the learner toward a useful starting point without preventing manual course selection.

## Entry points

Primary entry point for a new learner:

- Home `NEW` state -> `Hacer diagnóstico`.

Possible later entry points:

- Profile / current level.
- Courses.

The diagnostic remains optional. A learner may skip it and start a course directly.

## Overall flow

`INTRO -> IN_PROGRESS -> COMPLETED -> DIAGNOSTIC_RESULT`

Target duration for the MVP: approximately **5-10 minutes**, with roughly **8-12 short questions**. Exact count and educational content remain subject to Alma's validation.

## INTRO

### Purpose

Explain what the diagnostic does before the learner starts, without making it feel like a formal exam.

### Content

Typical content:

- `Diagnóstico de nivel` title.
- Short explanation that the test is optional and helps recommend a starting point.
- Estimated duration.
- Approximate number of questions.
- Brief explanation of benefits, such as discovering an initial starting point and receiving a course recommendation.

### Actions

Primary:

- `Comenzar diagnóstico`.

Secondary:

- `Ahora no` / skip.

Skipping the diagnostic must not block access to Courses or free learning content.

## IN_PROGRESS

### Purpose

Collect enough evidence to make a useful starting recommendation while keeping the interaction short and focused.

### UI hierarchy

Typical structure:

- Back/exit navigation.
- `Diagnóstico` title.
- Current question indicator such as `4 de 10`.
- Progress bar.
- Prompt/context.
- Answer controls.
- `Siguiente` action.

The active diagnostic should use a focused learning-flow layout rather than the full Home/global dashboard chrome.

## Question types

The diagnostic should reuse the existing activity engine when possible instead of creating a separate rendering system.

Preferred initial types:

- Multiple choice as the main format.
- Fill-in-the-blank with guided options when useful.
- A small number of typed fill-in-the-blank questions if Alma considers them pedagogically appropriate.
- Matching only when it genuinely improves measurement rather than adding variety for its own sake.

Speaking/listening assessment is out of scope for the initial MVP unless explicitly added later.

## Diagnostic feedback behavior

Unlike normal lesson practice, the diagnostic should **not show immediate correct/incorrect feedback after each answer**.

Reason:

- It is measuring current knowledge rather than teaching after each question.
- Immediate correction could influence later responses.
- The experience should feel like a short placement exercise, not a lesson.

Answers are submitted and the learner moves forward. The recommendation is produced after the diagnostic is completed.

## Content areas

Exact questions belong to Alma's pedagogical/content responsibility. Initial areas may include:

- Basic vocabulary.
- Greetings and introductions.
- Simple everyday phrases.
- Basic sentence structures.
- `to be` and other introductory grammar when applicable.
- Basic comprehension of short conversational contexts.

The app should not imply that a short MVP diagnostic can formally certify broad CEFR proficiency.

## Scoring / recommendation

The MVP can use a simple internal scoring model based on correctness and, if useful, configured question difficulty.

Conceptually:

`answers + question configuration -> internal score -> starting recommendation`

The internal score does not need to be presented as an exam percentage such as `60%`.

The learner-facing result should emphasize a recommendation and useful strengths/reinforcement context rather than pass/fail language.

## Course availability constraint

Recommendations must reflect content that actually exists in the product.

For example, if the learner demonstrates knowledge beyond the highest currently available course, do not claim a precise advanced placement that the app cannot support. Prefer wording such as:

- `Ya tienes bases previas`.
- Explain the highest currently available starting point.
- Allow the learner to choose manually.

As more levels are added, the same diagnostic architecture can map scores to a broader set of recommendations.

## Persistence

The system should be able to preserve at least:

- Whether the diagnostic was completed.
- Completion date/time.
- Internal result/score or recommendation data.
- Recommended course/level when applicable.

Individual answers may also be stored if useful for future analytics or recommendation improvements, but this should be implemented only if there is a clear product need.

The diagnostic should be repeatable later; completing it once should not permanently lock the learner into one recommendation.

## Current visual direction

The current mockups are provisional references and are considered sufficiently close for implementation planning, not final designs.

Direction:

- Same white/light base used across the app.
- Blue primary structure and progress indicators.
- Red primary CTA/accent.
- Rounded cards and subtle shadows.
- Friendly educational illustration/character use.
- Focused question screen with minimal distraction.
- Avoid treating the diagnostic as a stressful formal exam.

The exact character/mascot artwork is temporary and may later be replaced by Alma's own branded digital character.

## Client-dependent items

The following should remain configurable/open until Alma validates them:

- Exact number of questions.
- Exact educational content.
- Difficulty progression.
- Which activity variants are used.
- Score-to-recommendation thresholds.
- Whether questions may be skipped and how skipped questions affect scoring.

The architecture should avoid coupling the diagnostic UI to one fixed question set so these adjustments can be made without redesigning the entire feature.
