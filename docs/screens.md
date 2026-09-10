# Screens

This document records the functional definition of the main mobile screens as they are agreed. It is intentionally lightweight and will evolve with the MVP.

## Main navigation

Bottom navigation (provisional):

- Inicio
- Cursos
- Progreso
- Perfil

Meaning:

- **Inicio:** what the learner should do now.
- **Cursos:** available courses, course detail, learning route and lessons.
- **Progreso:** learning progress, review and statistics.
- **Perfil:** account, access/purchases and settings.

Premium is not a primary tab for the MVP. It should appear contextually when paid content is reached or from account/access areas.

---

## Home

### Purpose

Give the learner a clear next action immediately, while also exposing useful secondary actions without turning Home into a dense dashboard.

### Visual hierarchy

1. Header: greeting, notifications, coins and streak.
2. One dominant hero card whose content changes according to user state.
3. Two compact secondary cards.
4. Explore courses section.
5. Bottom navigation.

Home is vertically scrollable. The first viewport should prioritize the header and hero card.

### Hero behavior

The hero is **not an automatic carousel**. It is a single prominent component whose content changes according to the learner state.

### State: NEW

Conditions:

- User is registered.
- No placement/diagnostic test completed.
- No course started.

Hero:

- Title: `Descubre tu nivel`
- Short explanation of the diagnostic test.
- Primary action: `Hacer diagnóstico`.

Secondary content:

- `Empieza con A1` as an alternative path.
- `Tu primera meta` / initial daily goal.
- `Explorar cursos`.

Review is not shown because the user has no previous errors.

### State: ASSESSED

Conditions:

- Diagnostic test completed.
- No course started yet.

Hero:

- Show recommended level/course.
- Primary action starts the recommended course.

The diagnostic result should guide the user but should not prevent manual course selection.

### State: ACTIVE

Conditions:

- User has an active course or lesson in progress.

Hero: `Continuar aprendiendo`.

Show:

- Current course.
- Current topic/unit.
- Current lesson.
- Course progress.
- Primary `Continuar` action.

Secondary cards:

- `Repaso`, when there are pending errors/content to review.
- `Meta diaria`.

Below:

- `Explorar cursos` with a small number of visually rich course cards.
- Course cards should show level labels such as A1/A2 when applicable.

### State: COURSE_COMPLETED

Conditions:

- Current course is completed and no next course has been started.

Hero:

- Communicate course completion.
- Offer a clear next step, such as the next recommended course or continued review.

### Home design direction

Current provisional direction:

- White/light base.
- Blue primary color.
- Red accent color.
- Rounded cards and subtle shadows.
- Friendly, polished and lightly gamified.
- Gamification should come primarily from progress, streaks, coins, unlocking and feedback rather than decorative clutter.
- Avoid repeated motivational slogans, excessive illustrations and redundant information.

---

## Courses

### Purpose

Provide a clear place to discover available learning content and understand which courses are available, in progress, completed, locked or not yet released.

### Content

The MVP Courses screen should remain simple and should not initially require advanced search/filtering.

Each course card may show:

- Course title.
- Level label when applicable (for example A1, A2, B1).
- Short description.
- Visual thumbnail/illustration.
- Progress when the learner has started the course.
- Access/release status.
- A clear tap target or CTA.

### Course states

Conceptual states:

- `AVAILABLE`: learner can start the course.
- `IN_PROGRESS`: learner has started the course.
- `COMPLETED`: learner completed the course.
- `LOCKED_ACCESS`: learner lacks the required paid/access entitlement.
- `COMING_SOON`: course exists in the catalog but is not available yet.

A course may also be marked as free or premium independently from its learning-progress state.

### Interaction

- Tapping a normal course card opens Course Detail.
- Home's `Continuar` action may bypass Courses/Detail and go directly to the current lesson.
- Premium/access-locked content should explain the restriction instead of silently disabling interaction.

---

## Course Detail

### Purpose

Explain what a course contains and provide the appropriate next action before entering its learning route.

### Content

May show:

- Course title.
- Level label.
- Cover/visual identity.
- Short description.
- Progress when already started.
- Number of topics/modules.
- Number of lessons.
- Access status (free, included, purchased, premium/locked).
- Main CTA.

Optional metadata such as estimated duration should only be added if it becomes useful and can be supported reliably.

### Main CTA by state

- `AVAILABLE` / not started: `Comenzar curso`.
- `IN_PROGRESS`: `Continuar` or `Ver ruta`.
- `COMPLETED`: `Repasar curso` / `Ver ruta`.
- `LOCKED_ACCESS`: `Desbloquear` / show Premium flow.
- `COMING_SOON`: no start action; clearly communicate unavailable status.

### Navigation

`Cursos -> Detalle de curso -> Ruta de aprendizaje`

For an active learner, shortcuts from Home can go directly to the current lesson to reduce friction.

---

## Learning Route / Roadmap

### Purpose

Represent the learner's progression through a course in a visually motivating way while preserving clear academic structure.

### Structure

The route is vertically scrollable and organized conceptually as:

`Course -> Topic/Unit -> Lesson`

Topics/modules divide the roadmap into recognizable learning sections. Lessons are represented as roadmap nodes/stops rather than a plain list.

### Current visual direction

Client feedback favors a **gamified roadmap** over a purely academic list, with the gamified option preferred over the hybrid option. Final roadmap variant is still awaiting final in-person client validation.

Desired qualities:

- Visually engaging path.
- Vertical/serpentine progression.
- Clear grouping by topic/module.
- Blue primary, red accent, white/light base.
- Progress and unlocking should provide most of the gamified feeling.
- Avoid decorative overload and unnecessary motivational slogans.

### Lesson-node states

Conceptual states:

- `COMPLETED`: lesson finished; show clear completion indicator/check.
- `CURRENT`: the learner's current recommended lesson; visually emphasized and may expose a `Continuar` CTA.
- `AVAILABLE`: accessible but not currently selected/in progress.
- `LOCKED_PREREQUISITE`: unavailable because progression requirements are not yet satisfied.
- `LOCKED_ACCESS`: unavailable because the learner lacks the required entitlement/payment access.

`LOCKED_PREREQUISITE` and `LOCKED_ACCESS` may share a lock visual, but tapping them should explain different reasons.

### Node interaction

- `COMPLETED`: can be reopened/repeated.
- `CURRENT`: opens/resumes the lesson.
- `AVAILABLE`: opens/starts the lesson if progression rules permit it.
- `LOCKED_PREREQUISITE`: explain what must be completed first.
- `LOCKED_ACCESS`: open contextual Premium/unlock information.

### Topics/modules

For the roadmap-first direction, topics should function primarily as visual/structural separators for groups of lesson nodes rather than becoming large accordion/list cards.

A topic may display:

- Topic number/name.
- Topic-level completion status/progress.
- Its associated lesson segment.

### Progression

Sequential unlocking is the current provisional direction because it matches the roadmap concept and the client's interest in progressive unlocking. The exact rule is **not yet final** and must be validated with the client.

Possible provisional behavior:

- Completing required content in the current lesson unlocks the next lesson.
- Completed lessons remain repeatable.
- Premium access and learning prerequisites are separate concerns.

Do not hard-code a passing-score requirement for unlocking until the client confirms it.

### Course completion

When the final required lesson is completed:

- Mark the course as completed.
- Show course completion feedback/result.
- Keep the route accessible for review.
- Surface an appropriate next course/review action elsewhere in the app.

---

## Lesson

### Purpose

Present educational content as a sequence of reusable blocks rather than as one static screen.

### Typical flow

1. Lesson header.
2. Content blocks.
3. Activities.
4. Immediate feedback where applicable.
5. Lesson completion/result.

### Possible content blocks

- Video.
- Explanatory text.
- Examples.
- Images/media.
- Interactive activities.
- Short summary.

Not every lesson must contain every block type.

### Header

May show:

- Topic/unit.
- Lesson name.
- Progress within the lesson.
- Back navigation.

### Lesson states

- Not started.
- In progress.
- Completed.
- Locked when access rules require it.

---

## Activity

Initial MVP activity types:

1. Multiple choice.
2. Fill in the blank / typed answer.
3. Match word with image.

All activity types should share a common interaction pattern where possible:

`Show activity -> user answers -> check -> feedback -> save attempt -> continue`

### Feedback

For practice activities:

- Show correct/incorrect feedback immediately.
- Show a short explanation when useful.
- If incorrect, make the expected answer clear.
- Incorrect attempts can feed the Review experience.

### Matching interaction

For mobile, the preferred initial interaction is tap-to-select / tap-to-match instead of requiring drag and drop.

---

## Result / lesson completion

May show:

- Score or number of correct answers.
- Feedback.
- XP/coins or another gamification reward.
- Updated progress.
- Next lesson action.
- Return-to-route action.

Academic score and gamification points should be treated as separate concepts.

---

## Screens still to define in more detail

- Progreso.
- Repaso de errores.
- Premium / Paywall.
- Placement/diagnostic questionnaire.
- Diagnostic result.
- Profile.
- Settings.
- Purchases/access.
- Authentication screens.
