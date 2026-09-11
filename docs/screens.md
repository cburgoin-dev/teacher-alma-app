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

The hero is **not** an automatic carousel. It is a single prominent component whose content changes according to the learner state.

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

Deliver a guided learning experience composed of reusable content blocks and focused activities. A lesson is not treated as one static page and is not necessarily one screen per block.

### Experience model

The current provisional direction is **hybrid consumption**:

- Related explanatory content can be grouped into one scrollable content step.
- Interactive activities are shown as focused steps.
- The lesson should avoid both a giant continuous scroll and excessive fragmentation where every paragraph requires `Continuar`.

A conceptual lesson may contain blocks such as:

`TEXT -> EXAMPLE -> VIDEO -> ACTIVITY -> TEXT -> ACTIVITY -> SUMMARY`

These blocks may be grouped visually into fewer steps.

### Content block types

Initial conceptual block types:

- `TEXT`
- `VIDEO`
- `IMAGE`
- `EXAMPLE`
- `ACTIVITY`
- `SUMMARY`

A block may conceptually include:

- `id`
- `type`
- `position`
- `required`
- type-specific content/configuration

Not every lesson needs every block type.

### Step types

The active lesson experience can be represented through:

- `CONTENT_STEP`: one coherent group of explanatory content, examples, images and/or video.
- `ACTIVITY_STEP`: one focused interactive activity with answer/check/feedback behavior.
- `SUMMARY_STEP`: final pedagogical recap before the lesson is formally finished.

A block is a content unit; a step is a presentation/navigation unit. Several blocks can belong to one step.

### Header and visual hierarchy

A lesson should remain visually cleaner and more focused than Home or the Roadmap.

Typical header/content hierarchy:

- Back navigation.
- Topic/unit name.
- Lesson position (for example `Lección 2 de 8`).
- Lesson progress bar.
- Current step content.
- Clear primary CTA (`Continuar`, `Comprobar`, `Finalizar lección`, etc.).

The progress bar represents **lesson/content progression**, not academic correctness.

### Lesson states

Conceptual lesson states:

- `NOT_STARTED`
- `IN_PROGRESS`
- `COMPLETED`
- `LOCKED`

`LOCKED` may result from prerequisite or commercial-access rules defined elsewhere.

### Internal block/step progression

Useful conceptual block state:

- `NOT_VISITED`
- `CURRENT`
- `COMPLETED`

Activity correctness is tracked separately from block completion, for example:

- `UNANSWERED`
- `CORRECT`
- `INCORRECT`

An activity can therefore be completed/submitted even when answered incorrectly.

### Navigation and resume

- Entering a new lesson starts at the first required step.
- Re-entering an `IN_PROGRESS` lesson resumes at the last meaningful pending/current step.
- The learner may revisit previous content within the lesson.
- Required future content should not be silently skipped when sequential progression applies.
- Leaving the lesson before completion preserves progress and submitted activity attempts.

### Typical flow

`Enter/resume lesson -> Content step -> Continue -> Activity step -> Check -> Feedback -> Continue -> ... -> Summary step -> Finish lesson -> Result screen`

### Summary step

`SUMMARY_STEP` is part of the lesson itself and is distinct from the post-lesson Result screen.

Its purpose is pedagogical: remind the learner what was learned before formally ending the lesson.

It may contain:

- Key takeaways.
- Important phrases/concepts.
- Optional audio/replay actions.
- A `Finalizar lección` CTA.

### Current visual direction

Lesson mockups have established a focused extension of the global visual system:

- White/light base.
- Blue primary structure.
- Red primary CTA/accent.
- Rounded cards and subtle shadows.
- Clear progress indicator.
- Minimal decorative gamification while learning.
- Content remains the visual priority.

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

### Purpose

Close the lesson experience by telling the learner what they achieved, how they performed, what they earned, what may need review, and what the recommended next action is.

This screen is separate from `SUMMARY_STEP`:

- `SUMMARY_STEP` answers: **what did I learn?**
- Result answers: **how did I do and what happens next?**

Typical transition:

`... -> SUMMARY_STEP -> Finalizar lección -> Result`

### Core content

The Result screen should normally include:

- Clear lesson-completed state.
- Lesson title/name.
- Academic result, such as `8/10 respuestas correctas`.
- Gamification reward, such as coins; streak may be surfaced when relevant.
- Updated course progress.
- Pending-review count when incorrect attempts exist.
- A clear next action.

Academic score and gamification rewards remain separate concepts.

### Actions

Primary action:

- `Siguiente lección` when another accessible lesson exists.

Secondary actions:

- `Volver a la ruta`.
- `Repasar errores` when review items exist.

If there is no next accessible lesson, the primary action should adapt instead of showing a dead-end `Siguiente lección` button.

### Result states

Three useful visual/functional variants are currently defined:

#### NORMAL

The learner completed the lesson with a mixture of correct and incorrect answers.

Typical content:

- Completion confirmation.
- Score.
- Standard reward.
- Course progress.
- Small pending-review card.
- `Siguiente lección` as the main CTA.

#### PERFECT

The learner completed the lesson with a flawless or equivalent excellent result.

Differences from normal:

- Slightly stronger but still restrained celebration.
- Perfect academic result, for example `10/10`.
- No pending-review CTA when there are no errors.
- Reward presentation may feel more celebratory, but exact reward values are not yet fixed.

#### REVIEW_PENDING

The lesson is completed, but multiple errors should be reinforced.

Differences from normal:

- Review section receives more visual prominence.
- Clearly communicate the number of pending review items.
- `Repasar errores` becomes a stronger secondary action.
- The learner is still allowed to continue unless a future explicit assessment rule says otherwise.

### Visual direction

The first Result mockup is the current preferred base direction; the second is a useful more-celebratory alternative. The third, denser review-focused mockup is considered less suitable as the primary layout because it risks visual saturation and scrolling.

Desired qualities:

- Prefer a single-screen result experience without requiring scroll when practical.
- More celebratory than an active Lesson screen, but still clean and adult-acceptable.
- White/light base, blue structure, red main CTA/accent.
- Rounded cards, subtle shadows and restrained celebratory graphics.
- Do not assume the full global header (logo, notifications, coins, streak) or bottom navigation appears on Result; immersive learning-flow screens may omit global navigation/chrome.

---

## Progress

### Purpose

Help the learner understand **how their learning is going over time**, without duplicating Home's role as the main "what should I do now?" screen.

Progress should answer:

- How much have I advanced?
- How consistent have I been?
- What am I doing well?
- What should I reinforce next?
- What meaningful milestones have I achieved?

The tone should be encouraging and informative rather than judgmental. Avoid presenting weak performance in a way that feels punitive or frustrating.

### Relationship with Home

Home and Progress are both justified only if they keep distinct responsibilities:

- **Home:** next action / immediate learning continuation.
- **Progress:** reflection, reinforcement and longitudinal progress.

Progress should therefore avoid duplicating Home's large `Continuar` / `Comenzar` hero CTA or reproducing the same daily-goal/review cards with equal prominence.

### Preferred visual/content hierarchy

Current preferred order:

1. **Course progress summary**
2. **Para reforzar / Review access**
3. **Consistency**
4. **Strengths**
5. **Achievements / milestones**

The screen can scroll vertically, but the first viewport should keep the most actionable information visible. In particular, `Para reforzar` should be visible without substantial scrolling.

### Course progress summary

Show a concise summary such as:

- Current course/level.
- Overall course progress percentage.
- Completed lessons/topics.
- Secondary `Ver ruta` action.

`Ver ruta` should remain a secondary navigation action, not a dominant red CTA.

### Para reforzar

This area combines identified reinforcement areas with the persistent entry point to Review.

It may show:

- Topics/concepts that need more practice.
- Pending review count per topic when useful.
- `Ver repaso` / `Repasar ahora` CTA.

This is intentionally different from Home's compact review shortcut: Progress provides context about **what** should be reinforced, while Review provides the actual practice session.

Do not label content as `worst topic`, `bad performance`, etc. Prefer supportive wording such as `Para reforzar`.

### Consistency

Show learning habit in a compact, positive form, for example:

- Active days in the current week.
- A simple `L M X J V S D` activity row.
- Short summary such as `4 días esta semana`.

This is more informative than merely repeating the streak value already available in global/Home UI.

### Strengths

Show areas where the learner is performing consistently well, for example:

- Saludos.
- Presentaciones.
- Vocabulario básico.

Prefer readable labels/badges rather than dense percentages. Strengths should only appear once enough learning data exists to support them.

### Achievements / milestones

Use this area to reinforce meaningful progress, for example:

- First unit completed.
- Seven consecutive learning days.
- Ten lessons completed.

Achievements should celebrate real learning/habit milestones and should not dominate the screen over reinforcement or course progress.

### Progress states

#### NEW / INSUFFICIENT_DATA

Used when the learner has not yet generated enough learning history.

Behavior:

- Keep the screen useful and positive instead of filling it with discouraging `0%`, `0 days`, or empty charts.
- Explain that strengths, reinforcement areas and milestones will appear as the learner completes lessons.
- Show course/start context only when useful.
- Avoid fabricating strengths or weaknesses before enough evidence exists.

#### ACTIVE

Main state once enough history exists.

Show:

- Course progress.
- Reinforcement/review access.
- Weekly consistency.
- Strengths.
- Achievements.

#### NO_REVIEW_PENDING

A variation of ACTIVE where no pending review exists.

Instead of showing an empty/error-looking area, communicate a positive state such as `Todo al día por ahora` and keep reinforcement context subtle.

### Scroll and density

- Moderate vertical scroll is acceptable.
- Avoid turning Progress into a dense analytics dashboard.
- Actionable/relevant content belongs higher; passive statistics belong lower.
- Avoid complex charts unless a real learning need later justifies them.

### Current visual direction

The latest mockups are useful provisional references but are **not final**. The preferred base is the more spacious first direction, with the hierarchy above.

Visual principles remain consistent with the rest of the product:

- White/light base.
- Blue primary structure.
- Red used mainly for important reinforcement/action accents.
- Rounded cards and subtle shadows.
- Friendly illustrations/icons.
- Positive language.
- Avoid excessive duplicated statistics and dashboard-like clutter.

---

## Screens still to define in more detail

- Premium / Paywall.
- Placement/diagnostic questionnaire.
- Diagnostic result.
- Profile.
- Settings.
- Purchases/access.
- Authentication screens.
