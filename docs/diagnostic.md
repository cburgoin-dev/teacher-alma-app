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

## Course availability direction

Current product direction is to avoid recommending a level that immediately becomes a dead end.

Ideally, each supported level/course should expose at least a small amount of free content, for example a few introductory lessons depending on the course size. This lets a learner who is recommended B2/C1 try the recommended content before reaching a paid-access decision.

This is a provisional commercial/product direction, not a fixed lesson count. Alma still needs to validate how much free content each course should expose.

If a recommended level/course is not yet published, the result should clearly say that it is coming soon and offer a useful alternative, such as reviewing a lower available level or exploring other courses.

## DIAGNOSTIC_RESULT

### Purpose

Explain the learner's estimated starting level in a positive, qualitative way and recommend the most useful next course.

The result is a recommendation, not a formal certification or restriction.

### Preferred presentation

The result should emphasize:

- Estimated/recommended level, for example `Inglés A1` or `Inglés B2`.
- A short qualitative explanation of why that starting point is recommended.
- Strengths detected during the diagnostic.
- Areas that could be reinforced.
- Recommended course card/status.
- A clear primary next action.

Avoid making percentages, raw scores, rankings or pass/fail language the main learner-facing output.

### Strengths and reinforcement areas

Use qualitative labels such as:

- `Fortalezas`
- `Para reforzar`

Examples:

- Saludos.
- Vocabulario cotidiano.
- Comprensión general.
- `Verb to be`.
- Preguntas básicas.
- Estructuras más complejas.

The exact categories and wording depend on Alma's diagnostic content and should not be fabricated when the test does not provide enough evidence.

### Result states

#### RECOMMENDED_AVAILABLE

The recommended course exists and has content the learner can access now.

Typical actions:

- Primary: `Comenzar Inglés A1` / `Probar B2` / equivalent.
- Secondary: `Ver otros cursos`.

When the course contains a free introductory segment, the result may communicate that the learner can start with free lessons.

#### RECOMMENDED_COMING_SOON

The estimated level maps to a course that is not yet available.

Behavior:

- Clearly communicate that the recommended course is coming soon.
- Do not turn the result into an immediate paywall.
- Offer a useful alternative such as reviewing an available lower level or exploring other courses.

#### RECOMMENDED_ACCESS_LIMITED

The recommended course exists, but only part of it is accessible for free.

Behavior:

- Let the learner enter the available/free portion first when possible.
- Commercial decisions should happen contextually when the learner reaches paid content, not dominate the diagnostic-result experience.

### Monetization separation

The preferred result-screen direction is the cleaner, recommendation-focused variant.

Do **not** make subscription/purchase choices the primary purpose of the diagnostic result. The screen should first answer:

> What level/course should I start with?

If the recommended course later requires paid access, monetization should normally appear through the dedicated locked-content / paywall flow.

The broader commercial direction may eventually support both:

- Premium subscription access.
- Permanent purchase of an individual course.

That hybrid model still needs final validation and pricing rules before implementation. The diagnostic architecture should therefore depend on generic access/entitlement information rather than assuming subscription-only access.

### Navigation after result

Typical flow:

`Diagnostic result -> Start recommended course -> course progress becomes active -> Home becomes ACTIVE`

If the learner only views the recommendation and leaves without starting a course, Home may remain in the `ASSESSED` state and surface the recommendation later.

The learner remains free to ignore the recommendation and manually choose another course.

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
- Positive, qualitative result presentation.
- Avoid treating the diagnostic as a stressful formal exam.
- Keep payment choices out of the primary result hierarchy.

The exact character/mascot artwork is temporary and may later be replaced by Alma's own branded digital character.

## Client-dependent items

The following should remain configurable/open until Alma validates them:

- Exact number of questions.
- Exact educational content.
- Difficulty progression.
- Which activity variants are used.
- Score-to-recommendation thresholds.
- Whether questions may be skipped and how skipped questions affect scoring.
- Exact amount of free content per course/level.
- Behavior when a recommended course has not yet launched.
- Final wording/categories for strengths and reinforcement areas.

The architecture should avoid coupling the diagnostic UI to one fixed question set or one fixed commercial model so these adjustments can be made without redesigning the entire feature.
