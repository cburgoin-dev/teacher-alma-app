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

## Courses / learning route

### Purpose

Let the learner browse courses and navigate through topics and lessons while understanding progress and locked/unlocked content.

### Current preferred direction

A gamified roadmap is preferred over a purely academic list. The final visual variant is still awaiting final client validation.

The roadmap should support:

- Course progress.
- Topics/modules.
- Lesson nodes.
- Completed state.
- Current/available state.
- Locked state.
- Clear `Continuar` action for the current lesson.

The course structure is currently modeled conceptually as:

`Course -> Topic/Unit -> Lesson`

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
